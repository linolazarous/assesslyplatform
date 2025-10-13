/**
 * Helper functions for processing Stripe data before updating the database.
 */

// NOTE: Define standard plan structure mapping Stripe price IDs to internal plan names
const PLAN_MAP = {
    'price_basic_id_placeholder': 'Basic',
    'price_premium_id_placeholder': 'Premium',
    // Add other IDs as needed
};

/**
 * Maps a Stripe Price ID to a human-readable internal plan name.
 * @param {string} priceId - Stripe Price ID.
 * @returns {string} Internal plan name.
 */
export const getPlanFromPriceId = (priceId) => {
    return PLAN_MAP[priceId] || 'Unknown';
};

/**
 * Updates the organization's subscription status in the database.
 * @param {Object} orgsCollection - MongoDB collection object for organizations.
 * @param {string} orgId - ID of the organization.
 * @param {Object} subscription - Stripe subscription object (or data object from webhook).
 */
export const updateSubscriptionStatus = async (orgsCollection, orgId, subscription) => {
    const status = subscription.status; // e.g., 'active', 'canceled', 'past_due'
    
    // Extract price ID from the first item in the subscription object
    const priceId = subscription.items?.data[0]?.price?.id; 

    // Find the current period end timestamp
    const currentPeriodEnd = subscription.current_period_end * 1000; 

    const planName = getPlanFromPriceId(priceId);

    const updateDoc = {
        $set: {
            'subscription.status': status,
            'subscription.plan': planName,
            'subscription.stripeSubscriptionId': subscription.id,
            'subscription.currentPeriodEnd': currentPeriodEnd,
            'updatedAt': new Date()
        }
    };

    const result = await orgsCollection.updateOne({ orgId: orgId }, updateDoc);
    
    if (result.matchedCount === 0) {
        console.error(`[DB Error] Could not find organization ${orgId} to update subscription status.`);
    }

    return result;
};

