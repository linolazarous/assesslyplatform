import stripe
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Optional: Set API version (recommended)
stripe.api_version = "2023-10-16"

# Price IDs from environment
STRIPE_PRICE_IDS = {
    "free": os.getenv("STRIPE_FREE_PRICE_ID"),  # Free plan price ID (could be None)
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
    "professional": os.getenv("STRIPE_PRO_PRICE_ID"),
    "enterprise": None  # Custom pricing
}

# Plan configuration
PLAN_CONFIG = {
    "free": {
        "name": "Free Plan",
        "price": 0,
        "interval": "month",
        "currency": "usd"
    },
    "basic": {
        "name": "Basic Plan",
        "price": 2900,  # $29.00 in cents
        "interval": "month",
        "currency": "usd"
    },
    "professional": {
        "name": "Professional Plan",
        "price": 7900,  # $79.00 in cents
        "interval": "month",
        "currency": "usd"
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "price": None,  # Custom pricing
        "interval": "month",
        "currency": "usd"
    }
}


def validate_stripe_config() -> bool:
    """Validate Stripe configuration."""
    if not stripe.api_key:
        logger.error("Stripe API key not configured")
        return False
    
    if not stripe.api_key.startswith(("sk_test_", "sk_live_")):
        logger.warning("Stripe API key appears invalid")
    
    # Validate price IDs
    for plan, price_id in STRIPE_PRICE_IDS.items():
        if plan != "free" and plan != "enterprise" and not price_id:
            logger.error(f"Missing price ID for plan: {plan}")
            return False
    
    return True


async def create_stripe_customer(
    email: str, 
    name: str, 
    organization: str,
    metadata: Optional[Dict] = None
) -> Optional[str]:
    """Create a Stripe customer."""
    try:
        if not validate_stripe_config():
            return None
        
        customer_data = {
            "email": email,
            "name": name,
            "metadata": {
                "organization": organization,
                "created_at": datetime.utcnow().isoformat(),
                **(metadata or {})
            }
        }
        
        customer = stripe.Customer.create(**customer_data)
        logger.info(f"Created Stripe customer: {customer.id}")
        
        return customer.id
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error creating Stripe customer: {str(e)}")
        return None


async def get_or_create_stripe_customer(
    user_id: str,
    email: str,
    name: str,
    organization: str
) -> Optional[str]:
    """Get existing Stripe customer or create new one."""
    try:
        # Search for existing customer by email
        customers = stripe.Customer.search(
            query=f"email:'{email}'"
        )
        
        if customers and len(customers.data) > 0:
            customer = customers.data[0]
            logger.info(f"Found existing Stripe customer: {customer.id}")
            return customer.id
        
        # Create new customer
        return await create_stripe_customer(
            email=email,
            name=name,
            organization=organization,
            metadata={"user_id": user_id}
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error finding/creating customer: {str(e)}")
        return await create_stripe_customer(email, name, organization)
    except Exception as e:
        logger.error(f"Error finding/creating customer: {str(e)}")
        return None


async def create_subscription(
    customer_id: str,
    plan_id: str,
    payment_method_id: str,
    trial_days: int = 14  # 14-day free trial
) -> Optional[Dict]:
    """Create a Stripe subscription."""
    try:
        if not validate_stripe_config():
            return None
        
        # Handle free plan
        if plan_id == "free":
            return {
                "subscription_id": "free_plan",
                "status": "active",
                "plan_id": "free",
                "amount": 0,
                "currency": "usd",
                "trial_end": None,
                "is_free": True
            }
        
        # Handle enterprise plan (custom pricing)
        if plan_id == "enterprise":
            return {
                "subscription_id": "enterprise_custom",
                "status": "pending",
                "plan_id": "enterprise",
                "amount": None,  # Custom pricing
                "currency": "usd",
                "trial_end": None,
                "is_enterprise": True,
                "message": "Contact sales for enterprise pricing"
            }
        
        # Get price ID for the plan
        price_id = STRIPE_PRICE_IDS.get(plan_id)
        if not price_id:
            logger.error(f"No price ID found for plan: {plan_id}")
            return None
        
        # Attach payment method to customer
        try:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id
                }
            )
        except stripe.error.StripeError as e:
            logger.error(f"Error attaching payment method: {str(e)}")
            # Continue without attaching if it's a test mode card
        
        # Create subscription with trial
        subscription_data = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_settings": {
                "payment_method_types": ["card"],
                "save_default_payment_method": "on_subscription"
            },
            "expand": ["latest_invoice.payment_intent"],
            "metadata": {
                "plan": plan_id,
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
        # Add trial period for non-free plans
        if trial_days > 0:
            subscription_data["trial_period_days"] = trial_days
        
        subscription = stripe.Subscription.create(**subscription_data)
        
        # Get payment intent for immediate payment if needed
        client_secret = None
        if subscription.latest_invoice and subscription.latest_invoice.payment_intent:
            client_secret = subscription.latest_invoice.payment_intent.client_secret
        
        result = {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "plan_id": plan_id,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "trial_start": subscription.trial_start,
            "trial_end": subscription.trial_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "client_secret": client_secret,
            "invoice_url": subscription.latest_invoice.hosted_invoice_url if subscription.latest_invoice else None
        }
        
        logger.info(f"Created subscription {subscription.id} for plan {plan_id}")
        return result
        
    except stripe.error.CardError as e:
        logger.error(f"Card error creating subscription: {str(e)}")
        raise ValueError(f"Payment failed: {e.user_message}")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating subscription: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        return None


async def create_checkout_session(
    customer_id: Optional[str],
    plan_id: str,
    success_url: str,
    cancel_url: str,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None,
    trial_days: int = 14
) -> Optional[Dict]:
    """Create a Stripe Checkout Session for one-time payments."""
    try:
        if not validate_stripe_config():
            return None
        
        # Handle free plan
        if plan_id == "free":
            return {
                "session_id": "free_checkout",
                "url": success_url,
                "type": "free"
            }
        
        # Handle enterprise plan
        if plan_id == "enterprise":
            return {
                "session_id": "enterprise_contact",
                "url": cancel_url + "?plan=enterprise&action=contact",
                "type": "enterprise"
            }
        
        # Get price ID for the plan
        price_id = STRIPE_PRICE_IDS.get(plan_id)
        if not price_id:
            logger.error(f"No price ID found for plan: {plan_id}")
            return None
        
        # Prepare session parameters
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{
                "price": price_id,
                "quantity": 1,
            }],
            "mode": "subscription",
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "billing_address_collection": "required",
            "metadata": {
                "plan": plan_id,
                "user_id": user_id or "",
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
        # Add customer if exists
        if customer_id:
            session_params["customer"] = customer_id
        elif user_email:
            session_params["customer_email"] = user_email
        
        # Add trial period
        if trial_days > 0:
            session_params["subscription_data"] = {
                "trial_period_days": trial_days
            }
        
        # Create checkout session
        session = stripe.checkout.Session.create(**session_params)
        
        return {
            "session_id": session.id,
            "url": session.url,
            "type": "checkout"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        return None


async def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> bool:
    """Cancel a Stripe subscription."""
    try:
        if not validate_stripe_config():
            return False
        
        # Handle free plan
        if subscription_id == "free_plan":
            logger.info("Free plan canceled")
            return True
        
        # Handle enterprise plan
        if subscription_id == "enterprise_custom":
            logger.info("Enterprise plan requires manual cancellation")
            return True
        
        if at_period_end:
            # Cancel at period end
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            logger.info(f"Subscription {subscription_id} will cancel at period end")
        else:
            # Cancel immediately
            stripe.Subscription.delete(subscription_id)
            logger.info(f"Subscription {subscription_id} canceled immediately")
        
        return True
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        return False


async def get_subscription(subscription_id: str) -> Optional[Dict]:
    """Get subscription details."""
    try:
        if not validate_stripe_config():
            return None
        
        # Handle free plan
        if subscription_id == "free_plan":
            return {
                "id": "free_plan",
                "status": "active",
                "plan_id": "free",
                "current_period_start": None,
                "current_period_end": None,
                "cancel_at_period_end": False,
                "is_free": True
            }
        
        # Handle enterprise plan
        if subscription_id == "enterprise_custom":
            return {
                "id": "enterprise_custom",
                "status": "active",
                "plan_id": "enterprise",
                "current_period_start": None,
                "current_period_end": None,
                "cancel_at_period_end": False,
                "is_enterprise": True
            }
        
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get the price/plan info
        plan_id = subscription.metadata.get("plan", "unknown")
        if not plan_id:
            # Try to determine from price
            for item in subscription.items.data:
                price_id = item.price.id
                for p_id, s_price_id in STRIPE_PRICE_IDS.items():
                    if s_price_id == price_id:
                        plan_id = p_id
                        break
        
        return {
            "id": subscription.id,
            "status": subscription.status,
            "plan_id": plan_id,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "trial_start": subscription.trial_start,
            "trial_end": subscription.trial_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "canceled_at": subscription.canceled_at
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting subscription: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        return None


async def update_subscription(
    subscription_id: str,
    new_plan_id: str,
    prorate: bool = True
) -> Optional[Dict]:
    """Update subscription to a new plan."""
    try:
        if not validate_stripe_config():
            return None
        
        # Handle free plan upgrades/downgrades
        if subscription_id == "free_plan":
            # Free to paid upgrade
            if new_plan_id != "free":
                return {
                    "action": "upgrade_from_free",
                    "requires_payment": True,
                    "new_plan": new_plan_id
                }
            return {"action": "no_change"}
        
        # Handle enterprise plan changes
        if subscription_id == "enterprise_custom":
            return {
                "action": "enterprise_contact",
                "message": "Contact sales for enterprise plan changes"
            }
        
        # Get current subscription
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get new price ID
        new_price_id = STRIPE_PRICE_IDS.get(new_plan_id)
        if not new_price_id:
            logger.error(f"No price ID found for plan: {new_plan_id}")
            return None
        
        # Update subscription
        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            items=[{
                "id": subscription.items.data[0].id,
                "price": new_price_id,
            }],
            proration_behavior="create_prorations" if prorate else "none",
            metadata={**subscription.metadata, "plan": new_plan_id}
        )
        
        return {
            "id": updated_subscription.id,
            "status": updated_subscription.status,
            "plan_id": new_plan_id,
            "current_period_end": updated_subscription.current_period_end
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error updating subscription: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        return None


async def create_payment_intent(
    amount: int,
    currency: str = "usd",
    customer_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Optional[Dict]:
    """Create a Stripe PaymentIntent for one-time payments."""
    try:
        if not validate_stripe_config():
            return None
        
        payment_intent_data = {
            "amount": amount,
            "currency": currency,
            "automatic_payment_methods": {
                "enabled": True,
                "allow_redirects": "never"
            },
            "metadata": metadata or {}
        }
        
        if customer_id:
            payment_intent_data["customer"] = customer_id
        
        payment_intent = stripe.PaymentIntent.create(**payment_intent_data)
        
        logger.info(f"Created payment intent: {payment_intent.id}")
        
        return {
            "client_secret": payment_intent.client_secret,
            "id": payment_intent.id,
            "amount": payment_intent.amount,
            "currency": payment_intent.currency,
            "status": payment_intent.status
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        return None


async def handle_webhook_event(payload: bytes, sig_header: str, webhook_secret: str) -> Optional[Dict]:
    """Handle Stripe webhook events."""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        logger.info(f"Received Stripe webhook: {event.type}")
        
        # Handle different event types
        event_handlers = {
            "checkout.session.completed": _handle_checkout_completed,
            "customer.subscription.created": _handle_subscription_created,
            "customer.subscription.updated": _handle_subscription_updated,
            "customer.subscription.deleted": _handle_subscription_deleted,
            "invoice.payment_succeeded": _handle_payment_succeeded,
            "invoice.payment_failed": _handle_payment_failed,
        }
        
        handler = event_handlers.get(event.type)
        if handler:
            return await handler(event.data.object)
        
        return {"event": event.type, "handled": False}
        
    except ValueError as e:
        logger.error(f"Invalid Stripe webhook payload: {str(e)}")
        return None
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid Stripe webhook signature: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return None


async def _handle_checkout_completed(session: Dict) -> Dict:
    """Handle checkout.session.completed event."""
    logger.info(f"Checkout completed: {session.get('id')}")
    return {
        "event": "checkout.session.completed",
        "session_id": session.get("id"),
        "customer_id": session.get("customer"),
        "subscription_id": session.get("subscription"),
        "status": "success"
    }


async def _handle_subscription_created(subscription: Dict) -> Dict:
    """Handle customer.subscription.created event."""
    logger.info(f"Subscription created: {subscription.get('id')}")
    return {
        "event": "customer.subscription.created",
        "subscription_id": subscription.get("id"),
        "status": subscription.get("status"),
        "plan_id": subscription.get("metadata", {}).get("plan")
    }


async def _handle_subscription_updated(subscription: Dict) -> Dict:
    """Handle customer.subscription.updated event."""
    logger.info(f"Subscription updated: {subscription.get('id')}")
    return {
        "event": "customer.subscription.updated",
        "subscription_id": subscription.get("id"),
        "status": subscription.get("status"),
        "plan_id": subscription.get("metadata", {}).get("plan")
    }


async def _handle_subscription_deleted(subscription: Dict) -> Dict:
    """Handle customer.subscription.deleted event."""
    logger.info(f"Subscription deleted: {subscription.get('id')}")
    return {
        "event": "customer.subscription.deleted",
        "subscription_id": subscription.get("id"),
        "status": "canceled"
    }


async def _handle_payment_succeeded(invoice: Dict) -> Dict:
    """Handle invoice.payment_succeeded event."""
    logger.info(f"Payment succeeded for invoice: {invoice.get('id')}")
    return {
        "event": "invoice.payment_succeeded",
        "invoice_id": invoice.get("id"),
        "subscription_id": invoice.get("subscription"),
        "amount_paid": invoice.get("amount_paid"),
        "currency": invoice.get("currency")
    }


async def _handle_payment_failed(invoice: Dict) -> Dict:
    """Handle invoice.payment_failed event."""
    logger.error(f"Payment failed for invoice: {invoice.get('id')}")
    return {
        "event": "invoice.payment_failed",
        "invoice_id": invoice.get("id"),
        "subscription_id": invoice.get("subscription"),
        "attempt_count": invoice.get("attempt_count"),
        "next_payment_attempt": invoice.get("next_payment_attempt")
        }
