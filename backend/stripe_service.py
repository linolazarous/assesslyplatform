import stripe
import os
from typing import Optional, Dict

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

# Stripe price IDs (these would be your actual Stripe price IDs)
STRIPE_PRICE_IDS = {
    "free": None,
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID", "price_basic"),
    "professional": os.getenv("STRIPE_PRO_PRICE_ID", "price_professional"),
    "enterprise": None  # Enterprise is custom
}

async def create_stripe_customer(email: str, name: str, organization: str) -> Optional[str]:
    """Create a Stripe customer"""
    try:
        if not stripe.api_key or stripe.api_key == "":
            print("Stripe API key not configured")
            return None
            
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "organization": organization
            }
        )
        return customer.id
    except Exception as e:
        print(f"Error creating Stripe customer: {str(e)}")
        return None

async def create_subscription(customer_id: str, plan_id: str, payment_method_id: str) -> Optional[Dict]:
    """Create a Stripe subscription"""
    try:
        if not stripe.api_key or stripe.api_key == "":
            print("Stripe API key not configured")
            return None
            
        price_id = STRIPE_PRICE_IDS.get(plan_id)
        if not price_id:
            print(f"No price ID for plan: {plan_id}")
            return None
        
        # Attach payment method to customer
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
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_settings={
                "payment_method_types": ["card"],
                "save_default_payment_method": "on_subscription"
            },
            expand=["latest_invoice.payment_intent"]
        )
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice else None
        }
    except Exception as e:
        print(f"Error creating subscription: {str(e)}")
        return None

async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a Stripe subscription"""
    try:
        if not stripe.api_key or stripe.api_key == "":
            print("Stripe API key not configured")
            return False
            
        stripe.Subscription.delete(subscription_id)
        return True
    except Exception as e:
        print(f"Error canceling subscription: {str(e)}")
        return False

async def create_payment_intent(amount: int, currency: str = "usd") -> Optional[Dict]:
    """Create a Stripe payment intent"""
    try:
        if not stripe.api_key or stripe.api_key == "":
            print("Stripe API key not configured")
            return None
            
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={
                "enabled": True
            }
        )
        
        return {
            "client_secret": payment_intent.client_secret,
            "id": payment_intent.id
        }
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        return None
