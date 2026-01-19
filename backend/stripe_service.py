import stripe
import os
import logging
from typing import Optional, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------
# Stripe Configuration
# ---------------------------

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if not STRIPE_SECRET_KEY:
    raise RuntimeError("STRIPE_SECRET_KEY is not set")

if not STRIPE_WEBHOOK_SECRET:
    raise RuntimeError("STRIPE_WEBHOOK_SECRET is not set")

stripe.api_key = STRIPE_SECRET_KEY
stripe.api_version = "2023-10-16"

# ---------------------------
# Pricing & Plans
# ---------------------------

STRIPE_PRICE_IDS = {
    "free": None,
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
    "professional": os.getenv("STRIPE_PRO_PRICE_ID"),
    "enterprise": None,
}

VALID_PLANS = set(STRIPE_PRICE_IDS.keys())

PLAN_CONFIG = {
    "free": {"price": 0, "interval": "month", "currency": "usd"},
    "basic": {"price": 2900, "interval": "month", "currency": "usd"},
    "professional": {"price": 7900, "interval": "month", "currency": "usd"},
    "enterprise": {"price": None, "interval": "month", "currency": "usd"},
}

# ---------------------------
# Internal Utilities
# ---------------------------

def _validate_plan(plan_id: str):
    if plan_id not in VALID_PLANS:
        raise ValueError(f"Invalid plan: {plan_id}")


def validate_stripe_config() -> None:
    for plan, price_id in STRIPE_PRICE_IDS.items():
        if plan not in ("free", "enterprise") and not price_id:
            raise RuntimeError(f"Missing Stripe price ID for plan: {plan}")

# ---------------------------
# Customers
# ---------------------------

async def get_or_create_stripe_customer(
    user_id: str,
    email: str,
    name: str,
    organization: str
) -> Optional[str]:
    try:
        validate_stripe_config()

        customers = stripe.Customer.search(
            query=f"email:'{email}'",
            limit=1
        )

        if customers.data:
            return customers.data[0].id

        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "user_id": user_id,
                "organization": organization,
                "created_at": datetime.utcnow().isoformat()
            }
        )

        logger.info(f"Stripe customer created: {customer.id}")
        return customer.id

    except Exception as e:
        logger.error(f"Stripe customer error: {e}")
        return None

# ---------------------------
# Subscriptions
# ---------------------------

async def create_subscription(
    customer_id: str,
    plan_id: str,
    payment_method_id: Optional[str] = None,
    trial_days: int = 14
) -> Optional[Dict]:
    try:
        validate_stripe_config()
        _validate_plan(plan_id)

        if plan_id == "free":
            return {
                "subscription_id": "free_plan",
                "status": "active",
                "plan_id": "free",
                "is_free": True
            }

        if plan_id == "enterprise":
            return {
                "subscription_id": "enterprise_custom",
                "status": "pending",
                "plan_id": "enterprise",
                "requires_contact": True
            }

        price_id = STRIPE_PRICE_IDS[plan_id]

        if payment_method_id:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )

            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id
                }
            )

        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            trial_period_days=trial_days if trial_days > 0 else None,
            payment_settings={
                "save_default_payment_method": "on_subscription"
            },
            expand=["latest_invoice.payment_intent"],
            metadata={
                "plan": plan_id,
                "created_at": datetime.utcnow().isoformat()
            }
        )

        invoice = subscription.latest_invoice
        intent = invoice.payment_intent if invoice else None

        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "plan_id": plan_id,
            "trial_end": subscription.trial_end,
            "current_period_end": subscription.current_period_end,
            "client_secret": intent.client_secret if intent else None
        }

    except stripe.error.CardError as e:
        raise ValueError(e.user_message)
    except Exception as e:
        logger.error(f"Subscription creation failed: {e}")
        return None

# ---------------------------
# Checkout Session
# ---------------------------

async def create_checkout_session(
    plan_id: str,
    success_url: str,
    cancel_url: str,
    customer_id: Optional[str] = None,
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    trial_days: int = 14
) -> Optional[Dict]:
    try:
        validate_stripe_config()
        _validate_plan(plan_id)

        if plan_id == "free":
            return {"url": success_url, "type": "free"}

        if plan_id == "enterprise":
            return {
                "url": f"{cancel_url}?plan=enterprise",
                "type": "enterprise"
            }

        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": STRIPE_PRICE_IDS[plan_id],
                "quantity": 1
            }],
            customer=customer_id,
            customer_email=None if customer_id else email,
            subscription_data={
                "trial_period_days": trial_days,
                "metadata": {"plan": plan_id, "user_id": user_id or ""}
            },
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            allow_promotion_codes=True
        )

        return {"session_id": session.id, "url": session.url}

    except Exception as e:
        logger.error(f"Checkout session failed: {e}")
        return None

# ---------------------------
# Cancellation
# ---------------------------

async def cancel_subscription(subscription_id: str) -> bool:
    try:
        if subscription_id in ("free_plan", "enterprise_custom"):
            return True

        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )

        return True

    except Exception as e:
        logger.error(f"Cancel subscription failed: {e}")
        return False

# ---------------------------
# Webhooks
# ---------------------------

async def handle_webhook_event(payload: bytes, sig_header: str) -> Optional[Dict]:
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )

        logger.info(f"Stripe webhook received: {event.type}")

        handlers = {
            "checkout.session.completed": _on_checkout_completed,
            "customer.subscription.updated": _on_subscription_updated,
            "customer.subscription.deleted": _on_subscription_deleted,
            "invoice.payment_succeeded": _on_payment_succeeded,
            "invoice.payment_failed": _on_payment_failed,
        }

        handler = handlers.get(event.type)
        return await handler(event.data.object) if handler else {"handled": False}

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return None

# ---------------------------
# Webhook Handlers
# ---------------------------

async def _on_checkout_completed(session: Dict) -> Dict:
    return {
        "event": "checkout.session.completed",
        "subscription_id": session.get("subscription"),
        "customer_id": session.get("customer")
    }


async def _on_subscription_updated(subscription: Dict) -> Dict:
    return {
        "event": "subscription.updated",
        "id": subscription.get("id"),
        "status": subscription.get("status"),
        "plan": subscription.get("metadata", {}).get("plan")
    }


async def _on_subscription_deleted(subscription: Dict) -> Dict:
    return {
        "event": "subscription.deleted",
        "id": subscription.get("id")
    }


async def _on_payment_succeeded(invoice: Dict) -> Dict:
    return {
        "event": "payment.succeeded",
        "invoice_id": invoice.get("id"),
        "amount_paid": invoice.get("amount_paid")
    }


async def _on_payment_failed(invoice: Dict) -> Dict:
    return {
        "event": "payment.failed",
        "invoice_id": invoice.get("id"),
        "attempts": invoice.get("attempt_count")
    }
