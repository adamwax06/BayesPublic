from fastapi import APIRouter, HTTPException, Depends, Request
import os
from datetime import datetime
from typing import Dict, Any
import logging
import stripe

from auth import get_current_user, get_or_create_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["subscription"])


@router.get("/subscription-status")
async def get_subscription_status(
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """Return current user's subscription doc from Supabase (or create a free-tier one)."""
    try:
        return await get_or_create_subscription(current_user.id)
    except Exception as e:
        logger.error(
            f"Error fetching subscription status for user {current_user.id}: {e}"
        )
        raise HTTPException(
            status_code=500, detail="Could not retrieve subscription status."
        )


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Dict[str, Any], current_user=Depends(get_current_user)
):
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    billing_period = request.get("billing_period", "monthly")
    price_map = {
        "monthly": "price_1RlMRIKD4x7s8dfVFZq4dnvc",
        "yearly": "price_1RlMR2KD4x7s8dfVEst7ML5G",
    }
    if billing_period not in price_map:
        raise HTTPException(status_code=400, detail="Invalid billing period")

    price_id = price_map[billing_period]
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.checkout.Session.create(
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{frontend_url}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/pricing",
            customer_email=current_user.email,
            metadata={"user_id": current_user.id, "plan": "pro"},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (checkout completed & subscription.updated)."""
    from supabase import create_client

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.warning("Stripe webhook secret not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan", "pro")
        if not user_id:
            logger.error("Missing user_id in session metadata")
            return {"status": "error", "message": "No user_id in metadata"}

        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        subscription_id = session.get("subscription")
        subscription = (
            stripe.Subscription.retrieve(subscription_id) if subscription_id else None
        )

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            logger.error("Supabase configuration missing")
            return {"status": "error", "message": "Supabase not configured"}
        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        max_prompts = 100 if plan == "pro" else 10
        sub_data = {
            "user_id": user_id,
            "plan": plan,
            "status": "active",
            "stripe_customer_id": session.get("customer"),
            "stripe_subscription_id": subscription_id,
            "max_prompts_per_week": max_prompts,
            "prompts_used_this_week": 0,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if subscription:
            try:
                sub_data["current_period_start"] = datetime.fromtimestamp(
                    subscription.current_period_start
                ).isoformat()
                sub_data["current_period_end"] = datetime.fromtimestamp(
                    subscription.current_period_end
                ).isoformat()
            except Exception:
                pass

        existing = (
            service_supabase.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if existing.data:
            service_supabase.table("subscriptions").update(sub_data).eq(
                "user_id", user_id
            ).execute()
        else:
            service_supabase.table("subscriptions").insert(sub_data).execute()

        return {"status": "success"}

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            logger.error("Supabase configuration missing")
            return {"status": "error", "message": "Supabase not configured"}
        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        status_map = {
            "active": "active",
            "canceled": "cancelled",
            "past_due": "active",
            "unpaid": "cancelled",
            "incomplete": "cancelled",
            "incomplete_expired": "cancelled",
            "trialing": "active",
        }
        new_status = status_map.get(subscription.status, "cancelled")
        update_data = {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if subscription.current_period_start:
            update_data["current_period_start"] = datetime.fromtimestamp(
                subscription.current_period_start
            ).isoformat()
        if subscription.current_period_end:
            update_data["current_period_end"] = datetime.fromtimestamp(
                subscription.current_period_end
            ).isoformat()
        service_supabase.table("subscriptions").update(update_data).eq(
            "stripe_subscription_id", subscription.id
        ).execute()
        return {"status": "success"}

    return {"status": "unhandled", "event": event["type"]}


@router.get("/verify-checkout-session/{session_id}")
async def verify_checkout_session(
    session_id: str, current_user=Depends(get_current_user)
):
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    session = stripe.checkout.Session.retrieve(session_id)
    if session.metadata.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=403, detail="Session does not belong to current user"
        )

    if session.payment_status == "paid":
        from supabase import create_client

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            return {
                "payment_status": "paid",
                "subscription_status": "active",
                "plan": session.metadata.get("plan", "pro"),
            }
        service_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        db_sub = (
            service_supabase.table("subscriptions")
            .select("*")
            .eq("user_id", current_user.id)
            .execute()
        )
        if db_sub.data:
            sub = db_sub.data[0]
            return {
                "payment_status": "paid",
                "subscription_status": sub.get("status", "active"),
                "plan": sub.get("plan", "pro"),
                "max_prompts_per_week": sub.get("max_prompts_per_week", 100),
                "prompts_used_this_week": sub.get("prompts_used_this_week", 0),
                "current_period_end": sub.get("current_period_end"),
            }
        return {
            "payment_status": "paid",
            "subscription_status": "pending",
            "plan": session.metadata.get("plan", "pro"),
        }

    return {"payment_status": session.payment_status, "subscription_status": "inactive"}
