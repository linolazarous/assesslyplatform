import stripe
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json

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

# Plan configurations matching server.py expectations
PLAN_CONFIG = {
    "free": {
        "name": "Free Plan",
        "price": 0,
        "interval": "month",
        "currency": "usd",
        "features": [
            "Up to 5 assessments",
            "50 candidates per month",
            "Basic question types",
            "Email support",
            "7-day data retention",
            "Community access"
        ],
        "limits": {
            "assessments": 5,
            "candidates": 50,
            "questions": 100
        }
    },
    "basic": {
        "name": "Basic Plan",
        "price": 2900,  # $29.00
        "interval": "month",
        "currency": "usd",
        "features": [
            "Unlimited assessments",
            "500 candidates per month",
            "All question types",
            "Priority email support",
            "30-day data retention",
            "Custom branding",
            "Basic analytics",
            "API access"
        ],
        "limits": {
            "assessments": 50,  # Actually unlimited but server checks this
            "candidates": 500,
            "questions": 5000
        }
    },
    "professional": {
        "name": "Professional Plan",
        "price": 7900,  # $79.00
        "interval": "month",
        "currency": "usd",
        "features": [
            "Unlimited assessments",
            "5,000 candidates per month",
            "AI-assisted question generation",
            "24/7 priority support",
            "90-day data retention",
            "Custom branding & domains",
            "Advanced analytics & reports",
            "Full API & webhooks",
            "LMS/HRIS integrations",
            "Dedicated account manager"
        ],
        "limits": {
            "assessments": 1000,
            "candidates": 5000,
            "questions": 10000
        }
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "price": None,  # Custom pricing
        "interval": "month",
        "currency": "usd",
        "features": [
            "Unlimited everything",
            "Unlimited candidates",
            "White-label solutions",
            "Dedicated infrastructure",
            "Custom SLA & uptime",
            "Custom integrations",
            "SOC-2 compliance support",
            "On-premise deployment option",
            "Custom AI model training",
            "24/7 phone & email support",
            "Implementation assistance"
        ],
        "limits": {
            "assessments": 10000,
            "candidates": 1000000,
            "questions": 1000000
        }
    }
}

VALID_PLANS = set(PLAN_CONFIG.keys())

# ---------------------------
# Validation Functions
# ---------------------------

def validate_stripe_config() -> None:
    """Validate Stripe configuration - called from server.py startup."""
    if not STRIPE_ENABLED:
        logger.warning("Stripe is not enabled - STRIPE_SECRET_KEY is not set")
        # Don't raise error for development, just log warning
        if os.getenv("ENVIRONMENT") == "production":
            raise RuntimeError("Stripe is required for production")
        return
    
    try:
        # Test Stripe API connectivity
        stripe.Balance.retrieve()
        logger.info("Stripe configuration validated successfully")
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication failed: {e}")
        if os.getenv("ENVIRONMENT") == "production":
            raise RuntimeError("Stripe authentication failed") from e
    except Exception as e:
        logger.error(f"Stripe validation error: {e}")


def _validate_plan(plan_id: str):
    """Validate that the plan ID is valid."""
    if plan_id not in VALID_PLANS:
        raise ValueError(f"Invalid plan: {plan_id}. Valid plans are: {list(VALID_PLANS)}")

# ---------------------------
# Customer Management
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
        # Search for existing customer
        customers = stripe.Customer.search(
            query=f"email:'{email}'",
            limit=1
        )
        
        if customers.data:
            customer_id = customers.data[0].id
            logger.info(f"Found existing Stripe customer: {customer_id}")
            
            # Update metadata if needed
            if not customers.data[0].metadata.get("user_id"):
                stripe.Customer.modify(
                    customer_id,
                    metadata={
                        "user_id": user_id,
                        "organization": organization,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                )
            
            return customer_id

        # Create new customer
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "user_id": user_id,
                "organization": organization,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(f"Created new Stripe customer: {customer.id}")
        return customer.id

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to create Stripe customer: {e}")
        return None

# ---------------------------
# Product & Price Management
# ---------------------------

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
            metadata={
                "plan_id": plan_id,
                "limits": json.dumps(plan_config.get("limits", {})),
                "features": json.dumps(plan_config.get("features", []))
            }
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
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating product/price: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to create Stripe product/price: {e}")
        return None


async def _get_or_create_price_id(plan_id: str) -> Optional[str]:
    """Get existing price ID or create a new one."""
    if plan_id in ["free", "enterprise"]:
        return None
    
    # Try to get from environment variables first
    price_id = STRIPE_PRICE_IDS.get(plan_id)
    
    if price_id:
        try:
            # Verify the price exists and is active
            price = stripe.Price.retrieve(price_id)
            if price.active:
                logger.info(f"Using existing Stripe price for {plan_id}: {price_id}")
                return price_id
            else:
                logger.warning(f"Price {price_id} is not active, creating new one")
        except stripe.error.StripeError:
            logger.warning(f"Price {price_id} not found, creating new one")
    
    # Create new product/price
    return await _create_product_and_price(plan_id)

# ---------------------------
# Subscription Management
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
        _validate_plan(plan_id)

        # Handle free plan
        if plan_id == "free":
            return {
                "subscription_id": "free_plan",
                "status": "active",
                "plan_id": "free",
                "is_free": True,
                "amount": 0,
                "currency": "usd"
            }

        # Handle enterprise plan
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
            except stripe.error.StripeError as e:
                logger.warning(f"Could not attach payment method: {e}")

        # Create subscription
        subscription_data = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_settings": {"save_default_payment_method": "on_subscription"},
            "metadata": {
                "plan": plan_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
        # Add trial period if specified
        if trial_days > 0:
            subscription_data["trial_period_days"] = trial_days
        
        subscription = stripe.Subscription.create(**subscription_data)

        plan_config = PLAN_CONFIG[plan_id]
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "plan_id": plan_id,
            "trial_end": subscription.trial_end,
            "current_period_end": subscription.current_period_end,
            "amount": plan_config.get("price"),
            "currency": plan_config.get("currency", "usd"),
            "client_secret": None
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
        _validate_plan(plan_id)

        # Handle free plan
        if plan_id == "free":
            return {
                "type": "free",
                "url": success_url.replace("{CHECKOUT_SESSION_ID}", "free"),
                "message": "Successfully switched to free plan"
            }

        # Handle enterprise plan
        if plan_id == "enterprise":
            return {
                "type": "enterprise",
                "url": cancel_url.replace("pricing", "contact") + "?plan=enterprise",
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
            "success_url": success_url,
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "subscription_data": {
                "metadata": {
                    "plan": plan_id,
                    "user_id": user_id or "",
                    "created_at": datetime.now(timezone.utc).isoformat()
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
# Subscription Cancellation
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
# Webhook Handling
# ---------------------------

async def handle_webhook_event(payload: bytes, sig_header: str) -> Optional[Dict[str, Any]]:
    """Handle Stripe webhook events - called from server.py."""
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
        
        return {
            "id": event.id,
            "type": event.type,
            "data": event.data.to_dict(),
            "created": event.created
        }

    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe webhook signature verification failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return None


# ---------------------------
# Helper Functions for Server
# ---------------------------

async def handle_checkout_completed(event: Dict) -> None:
    """Handle checkout.session.completed event - called from server.py."""
    try:
        session = event.get("data", {}).get("object", {})
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")
        
        logger.info(f"Checkout completed: {session.get('id')}, customer: {customer_id}")
        
        # You can add logic here to update your database
        # For example, update user's subscription status
        
    except Exception as e:
        logger.error(f"Error processing checkout completed: {e}")


async def handle_subscription_updated(event: Dict) -> None:
    """Handle customer.subscription.updated event - called from server.py."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        status = subscription.get("status")
        
        logger.info(f"Subscription updated: {subscription_id} - {status}")
        
        # Update subscription status in your database
        
    except Exception as e:
        logger.error(f"Error processing subscription updated: {e}")


async def handle_subscription_deleted(event: Dict) -> None:
    """Handle customer.subscription.deleted event - called from server.py."""
    try:
        subscription = event.get("data", {}).get("object", {})
        subscription_id = subscription.get("id")
        customer_id = subscription.get("customer")
        
        logger.info(f"Subscription deleted: {subscription_id}")
        
        # Update subscription status in your database
        # Downgrade user to free plan
        
    except Exception as e:
        logger.error(f"Error processing subscription deleted: {e}")


async def handle_invoice_payment_succeeded(event: Dict) -> None:
    """Handle invoice.payment_succeeded event - called from server.py."""
    try:
        invoice = event.get("data", {}).get("object", {})
        invoice_id = invoice.get("id")
        amount_paid = invoice.get("amount_paid") / 100  # Convert from cents
        
        logger.info(f"Payment succeeded: {invoice_id} - ${amount_paid}")
        
        # Update billing records in your database
        
    except Exception as e:
        logger.error(f"Error processing payment succeeded: {e}")


async def handle_invoice_payment_failed(event: Dict) -> None:
    """Handle invoice.payment_failed event - called from server.py."""
    try:
        invoice = event.get("data", {}).get("object", {})
        invoice_id = invoice.get("id")
        
        logger.warning(f"Payment failed: {invoice_id}")
        
        # Update subscription status and notify user
        
    except Exception as e:
        logger.error(f"Error processing payment failed: {e}")


# ---------------------------
# Additional Utility Functions
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
            "trial_end": subscription.trial_end,
            "items": [
                {
                    "price_id": item.price.id,
                    "quantity": item.quantity
                }
                for item in subscription.items.data
            ]
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting subscription: {e}")
        return None
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
            ] if hasattr(customer, 'subscriptions') else []
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting customer: {e}")
        return None
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
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to create payment intent: {e}")
        return None


async def get_plan_limits(plan_id: str) -> Dict[str, Any]:
    """Get plan limits for validation."""
    plan_config = PLAN_CONFIG.get(plan_id, PLAN_CONFIG["free"])
    return plan_config.get("limits", {"assessments": 5, "candidates": 50, "questions": 100})


async def get_plan_details(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get detailed plan information."""
    if plan_id not in PLAN_CONFIG:
        return None
    
    plan_config = PLAN_CONFIG[plan_id].copy()
    plan_config["id"] = plan_id
    
    # Add Stripe price ID if available
    price_id = STRIPE_PRICE_IDS.get(plan_id)
    if price_id:
        plan_config["stripe_price_id"] = price_id
    
    return plan_config


def get_available_plans() -> Dict[str, Any]:
    """Get all available plans with their details."""
    plans = {}
    for plan_id, config in PLAN_CONFIG.items():
        plans[plan_id] = {
            "id": plan_id,
            "name": config["name"],
            "price": config["price"],
            "currency": config["currency"],
            "interval": config["interval"],
            "features": config.get("features", []),
            "limits": config.get("limits", {}),
            "stripe_price_id": STRIPE_PRICE_IDS.get(plan_id)
        }
    return plans
