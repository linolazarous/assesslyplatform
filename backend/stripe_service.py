import stripe
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------
# Stripe Configuration
# ---------------------------

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if not STRIPE_SECRET_KEY:
    logger.warning("STRIPE_SECRET_KEY is not set - Stripe features will be disabled")
    STRIPE_ENABLED = False
else:
    STRIPE_ENABLED = True
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_version = "2023-10-16"

# ---------------------------
# Pricing & Plans
# ---------------------------

STRIPE_PRICE_IDS = {
    "free": None,
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
    "professional": os.getenv("STRIPE_PROFESSIONAL_PRICE_ID"),
    "enterprise": None,
}

# Fallback to manual price creation if price IDs are not set
PLAN_CONFIG = {
    "free": {
        "name": "Free Plan",
        "price": 0,
        "interval": "month",
        "currency": "usd",
        "features": [
            "Up to 50 candidates",
            "5 assessments",
            "Basic assessment types",
            "Email support"
        ]
    },
    "basic": {
        "name": "Basic Plan",
        "price": 2900,  # $29.00
        "interval": "month",
        "currency": "usd",
        "features": [
            "Up to 500 candidates",
            "50 assessments",
            "Advanced assessment types",
            "Priority support",
            "Basic analytics",
            "API access"
        ]
    },
    "professional": {
        "name": "Professional Plan",
        "price": 7900,  # $79.00
        "interval": "month",
        "currency": "usd",
        "features": [
            "Unlimited candidates",
            "Unlimited assessments",
            "All assessment types",
            "Dedicated support",
            "Advanced analytics",
            "AI-powered insights",
            "Custom branding"
        ]
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "price": None,  # Custom pricing
        "interval": "month",
        "currency": "usd",
        "features": [
            "Everything in Professional",
            "Custom solutions",
            "SLA guarantee",
            "Dedicated account manager",
            "On-premise deployment",
            "White-label option"
        ]
    }
}

VALID_PLANS = set(PLAN_CONFIG.keys())

# ---------------------------
# Internal Utilities
# ---------------------------

def _validate_plan(plan_id: str):
    """Validate that the plan ID is valid."""
    if plan_id not in VALID_PLANS:
        raise ValueError(f"Invalid plan: {plan_id}")


def validate_stripe_config() -> None:
    """Validate Stripe configuration."""
    if not STRIPE_ENABLED:
        raise RuntimeError("Stripe is not enabled - STRIPE_SECRET_KEY is not set")
    
    # Check if we have price IDs for paid plans
    for plan in ["basic", "professional"]:
        if not STRIPE_PRICE_IDS.get(plan):
            logger.warning(f"Stripe price ID not set for {plan} plan. Creating product/price on the fly.")


async def _create_product_and_price(plan_id: str) -> Optional[str]:
    """Create a Stripe product and price if they don't exist."""
    if not STRIPE_ENABLED:
        return None
    
    try:
        plan_config = PLAN_CONFIG[plan_id]
        
        # Create product
        product = stripe.Product.create(
            name=plan_config["name"],
            description=f"Assessly Platform - {plan_config['name']}",
            metadata={"plan_id": plan_id}
        )
        
        # Create price
        price = stripe.Price.create(
            unit_amount=plan_config["price"],
            currency=plan_config["currency"],
            recurring={"interval": plan_config["interval"]},
            product=product.id,
            metadata={"plan_id": plan_id}
        )
        
        logger.info(f"Created Stripe product/price for {plan_id}: {price.id}")
        return price.id
        
    except Exception as e:
        logger.error(f"Failed to create Stripe product/price for {plan_id}: {e}")
        return None


async def _get_or_create_price_id(plan_id: str) -> Optional[str]:
    """Get existing price ID or create a new one."""
    if plan_id in ["free", "enterprise"]:
        return None
    
    # Try to get from environment variables
    price_id = STRIPE_PRICE_IDS.get(plan_id)
    
    if not price_id and STRIPE_ENABLED:
        # Try to find existing price in Stripe
        try:
            prices = stripe.Price.list(limit=100, active=True)
            for price in prices.auto_paging_iter():
                if price.metadata.get("plan_id") == plan_id:
                    logger.info(f"Found existing price for {plan_id}: {price.id}")
                    return price.id
        except Exception as e:
            logger.warning(f"Could not search for existing prices: {e}")
        
        # Create new product/price
        price_id = await _create_product_and_price(plan_id)
    
    return price_id


# ---------------------------
# Customers
# ---------------------------

async def get_or_create_stripe_customer(
    user_id: str,
    email: str,
    name: str,
    organization: str
) -> Optional[str]:
    """
    Get existing Stripe customer by email or create a new one.
    """
    if not STRIPE_ENABLED:
        logger.warning("Stripe is not enabled, cannot create customer")
        return None
    
    try:
        validate_stripe_config()

        # Search for existing customer
        customers = stripe.Customer.search(
            query=f"email:'{email}'",
            limit=1
        )
        
        if customers.data:
            customer_id = customers.data[0].id
            logger.info(f"Found existing Stripe customer: {customer_id}")
            return customer_id

        # Create new customer
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "user_id": user_id,
                "organization": organization,
                "created_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"Created new Stripe customer: {customer.id}")
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
) -> Optional[Dict[str, Any]]:
    """Create a subscription for a customer."""
    if not STRIPE_ENABLED:
        logger.warning("Stripe is not enabled, cannot create subscription")
        return None
    
    try:
        validate_stripe_config()
        _validate_plan(plan_id)

        # Free plan
        if plan_id == "free":
            return {
                "subscription_id": "free_plan",
                "status": "active",
                "plan_id": "free",
                "is_free": True
            }

        # Enterprise plan
        if plan_id == "enterprise":
            return {
                "subscription_id": "enterprise_custom",
                "status": "pending",
                "plan_id": "enterprise",
                "requires_contact": True,
                "message": "Please contact our sales team for enterprise pricing"
            }

        # Get or create price ID
        price_id = await _get_or_create_price_id(plan_id)
        if not price_id:
            raise ValueError(f"Could not get price ID for plan: {plan_id}")

        # Attach payment method if provided
        if payment_method_id:
            try:
                stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
            except Exception as e:
                logger.warning(f"Could not attach payment method: {e}")

        # Create subscription
        subscription_data = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_settings": {"save_default_payment_method": "on_subscription"},
            "metadata": {
                "plan": plan_id,
                "user_id": customer_id,
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
        # Add trial period if specified
        if trial_days > 0:
            subscription_data["trial_period_days"] = trial_days
        
        subscription = stripe.Subscription.create(**subscription_data)

        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "plan_id": plan_id,
            "trial_end": subscription.trial_end,
            "current_period_end": subscription.current_period_end,
            "client_secret": None  # Will be populated by checkout session
        }

    except stripe.error.CardError as e:
        logger.error(f"Stripe card error: {e.user_message}")
        raise ValueError(f"Card error: {e.user_message}")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise ValueError(f"Payment error: {str(e)}")
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
    trial_days: int = 7
) -> Optional[Dict[str, Any]]:
    """
    Create a Stripe Checkout Session for payment.
    Returns a URL that redirects to Stripe's payment form.
    """
    if not STRIPE_ENABLED:
        logger.warning("Stripe is not enabled, cannot create checkout session")
        return {
            "type": "disabled",
            "message": "Stripe payment is currently disabled. Please contact support."
        }
    
    try:
        validate_stripe_config()
        _validate_plan(plan_id)

        # Handle free plan
        if plan_id == "free":
            return {
                "type": "free",
                "url": success_url,
                "message": "Successfully switched to free plan"
            }

        # Handle enterprise plan
        if plan_id == "enterprise":
            return {
                "type": "enterprise",
                "url": f"{cancel_url}?plan=enterprise&contact=sales",
                "message": "Please contact our sales team for enterprise pricing"
            }

        # Get or create price ID
        price_id = await _get_or_create_price_id(plan_id)
        if not price_id:
            raise ValueError(f"Could not get price ID for plan: {plan_id}")

        # Build session parameters
        session_params = {
            "mode": "subscription",
            "payment_method_types": ["card"],
            "line_items": [{
                "price": price_id,
                "quantity": 1
            }],
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "subscription_data": {
                "metadata": {
                    "plan": plan_id,
                    "user_id": user_id or "",
                    "created_at": datetime.utcnow().isoformat()
                }
            }
        }
        
        # Add customer information
        if customer_id:
            session_params["customer"] = customer_id
        elif email:
            session_params["customer_email"] = email
        
        # Add trial period if specified
        if trial_days > 0:
            session_params["subscription_data"]["trial_period_days"] = trial_days
        
        # Create checkout session
        session = stripe.checkout.Session.create(**session_params)
        
        logger.info(f"Created checkout session for plan {plan_id}: {session.id}")
        
        return {
            "type": "checkout",
            "session_id": session.id,
            "url": session.url,
            "message": "Checkout session created successfully"
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        return {
            "type": "error",
            "message": f"Payment error: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Checkout session creation failed: {e}")
        return {
            "type": "error",
            "message": f"Failed to create checkout session: {str(e)}"
        }


# ---------------------------
# Cancellation
# ---------------------------

async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription."""
    if not STRIPE_ENABLED:
        logger.warning("Stripe is not enabled, cannot cancel subscription")
        return True  # Return True for free/enterprise plans
    
    try:
        # Handle non-Stripe subscription IDs
        if subscription_id in ["free_plan", "enterprise_custom"]:
            return True
        
        # Cancel Stripe subscription
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        logger.info(f"Cancelled subscription: {subscription_id}")
        return True

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error cancelling subscription: {e}")
        return False
    except Exception as e:
        logger.error(f"Cancel subscription failed: {e}")
        return False


# ---------------------------
# Webhooks
# ---------------------------

async def handle_webhook_event(payload: bytes, sig_header: str) -> Optional[Dict[str, Any]]:
    """Handle Stripe webhook events."""
    if not STRIPE_ENABLED or not STRIPE_WEBHOOK_SECRET:
        logger.warning("Stripe webhooks are not enabled")
        return None
    
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
        
        logger.info(f"Stripe webhook received: {event.type}")
        
        # Map event types to handlers
        event_handlers = {
            "checkout.session.completed": _on_checkout_completed,
            "checkout.session.async_payment_failed": _on_checkout_payment_failed,
            "checkout.session.async_payment_succeeded": _on_checkout_payment_succeeded,
            "customer.subscription.created": _on_subscription_created,
            "customer.subscription.updated": _on_subscription_updated,
            "customer.subscription.deleted": _on_subscription_deleted,
            "invoice.payment_succeeded": _on_payment_succeeded,
            "invoice.payment_failed": _on_payment_failed,
            "invoice.paid": _on_invoice_paid,
            "invoice.payment_action_required": _on_payment_action_required,
        }
        
        handler = event_handlers.get(event.type)
        if handler:
            return await handler(event.data.object)
        else:
            logger.debug(f"No handler for event type: {event.type}")
            return {"handled": False, "event_type": event.type}

    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe webhook signature verification failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return None


# ---------------------------
# Webhook Handlers
# ---------------------------

async def _on_checkout_completed(session: Dict) -> Dict[str, Any]:
    """Handle successful checkout completion."""
    return {
        "event": "checkout.session.completed",
        "session_id": session.get("id"),
        "subscription_id": session.get("subscription"),
        "customer_id": session.get("customer"),
        "customer_email": session.get("customer_email"),
        "amount_total": session.get("amount_total"),
        "currency": session.get("currency")
    }


async def _on_checkout_payment_failed(session: Dict) -> Dict[str, Any]:
    """Handle failed payment in checkout."""
    return {
        "event": "checkout.session.async_payment_failed",
        "session_id": session.get("id"),
        "customer_id": session.get("customer"),
        "payment_intent": session.get("payment_intent")
    }


async def _on_checkout_payment_succeeded(session: Dict) -> Dict[str, Any]:
    """Handle successful payment in checkout."""
    return {
        "event": "checkout.session.async_payment_succeeded",
        "session_id": session.get("id"),
        "customer_id": session.get("customer"),
        "payment_intent": session.get("payment_intent")
    }


async def _on_subscription_created(subscription: Dict) -> Dict[str, Any]:
    """Handle subscription creation."""
    return {
        "event": "customer.subscription.created",
        "subscription_id": subscription.get("id"),
        "customer_id": subscription.get("customer"),
        "status": subscription.get("status"),
        "plan_id": subscription.get("metadata", {}).get("plan"),
        "current_period_end": subscription.get("current_period_end")
    }


async def _on_subscription_updated(subscription: Dict) -> Dict[str, Any]:
    """Handle subscription updates."""
    return {
        "event": "customer.subscription.updated",
        "subscription_id": subscription.get("id"),
        "customer_id": subscription.get("customer"),
        "status": subscription.get("status"),
        "plan_id": subscription.get("metadata", {}).get("plan"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end")
    }


async def _on_subscription_deleted(subscription: Dict) -> Dict[str, Any]:
    """Handle subscription deletion."""
    return {
        "event": "customer.subscription.deleted",
        "subscription_id": subscription.get("id"),
        "customer_id": subscription.get("customer"),
        "status": subscription.get("status")
    }


async def _on_payment_succeeded(invoice: Dict) -> Dict[str, Any]:
    """Handle successful payment."""
    return {
        "event": "invoice.payment_succeeded",
        "invoice_id": invoice.get("id"),
        "customer_id": invoice.get("customer"),
        "subscription_id": invoice.get("subscription"),
        "amount_paid": invoice.get("amount_paid"),
        "currency": invoice.get("currency")
    }


async def _on_payment_failed(invoice: Dict) -> Dict[str, Any]:
    """Handle failed payment."""
    return {
        "event": "invoice.payment_failed",
        "invoice_id": invoice.get("id"),
        "customer_id": invoice.get("customer"),
        "subscription_id": invoice.get("subscription"),
        "attempts": invoice.get("attempt_count"),
        "next_payment_attempt": invoice.get("next_payment_attempt")
    }


async def _on_invoice_paid(invoice: Dict) -> Dict[str, Any]:
    """Handle invoice payment."""
    return {
        "event": "invoice.paid",
        "invoice_id": invoice.get("id"),
        "customer_id": invoice.get("customer"),
        "subscription_id": invoice.get("subscription"),
        "amount_paid": invoice.get("amount_paid"),
        "currency": invoice.get("currency")
    }


async def _on_payment_action_required(invoice: Dict) -> Dict[str, Any]:
    """Handle payment requiring additional action."""
    return {
        "event": "invoice.payment_action_required",
        "invoice_id": invoice.get("id"),
        "customer_id": invoice.get("customer"),
        "subscription_id": invoice.get("subscription"),
        "payment_intent": invoice.get("payment_intent")
    }


# ---------------------------
# Additional Payment Functions
# ---------------------------

async def get_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
    """Get subscription details."""
    if not STRIPE_ENABLED:
        return None
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        return {
            "id": subscription.id,
            "status": subscription.status,
            "plan_id": subscription.metadata.get("plan"),
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "canceled_at": subscription.canceled_at,
            "items": [
                {
                    "price_id": item.price.id,
                    "quantity": item.quantity
                }
                for item in subscription.items.data
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get subscription: {e}")
        return None


async def get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
    """Get customer details."""
    if not STRIPE_ENABLED:
        return None
    
    try:
        customer = stripe.Customer.retrieve(customer_id)
        
        return {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "metadata": customer.metadata,
            "subscriptions": [
                sub.id for sub in customer.subscriptions.data
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get customer: {e}")
        return None


async def create_payment_intent(
    amount: int,
    currency: str = "usd",
    customer_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Optional[Dict[str, Any]]:
    """Create a payment intent for one-time payments."""
    if not STRIPE_ENABLED:
        return None
    
    try:
        params = {
            "amount": amount,
            "currency": currency,
            "automatic_payment_methods": {
                "enabled": True,
                "allow_redirects": "never"
            }
        }
        
        if customer_id:
            params["customer"] = customer_id
        
        if metadata:
            params["metadata"] = metadata
        
        intent = stripe.PaymentIntent.create(**params)
        
        return {
            "client_secret": intent.client_secret,
            "id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status
        }
    except Exception as e:
        logger.error(f"Failed to create payment intent: {e}")
        return None
