import connectToDatabase from '../../src/utils/mongo.jsx';
import { stripe } from '../../src/utils/stripe.jsx'; // FIX: Named import + corrected extension
import { updateSubscriptionStatus } from '../../src/utils/billing-helpers.js'; // FIX: Corrected import path/extension

// IMPORTANT: This API route must be configured to disable body parser 
// for Stripe signature verification to work correctly.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body for signature verification (needed for environments like Vercel/Next.js)
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    // Ensure chunk is converted to Buffer if it's a string
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // --- 1. Get Raw Body and Verify Signature ---
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Processing Stripe event: ${event.type}`);

  // --- 2. Process Event and Update Database ---
  try {
    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');
    const billingLogsCollection = db.collection('billingLogs');
    const billingInvoicesCollection = db.collection('billingInvoices');

    const data = event.data.object;

    switch (event.type) {
      
      case 'checkout.session.completed':
        const orgIdCheckout = data.metadata?.orgId;
        if (!orgIdCheckout) {
            console.error('Checkout metadata missing orgId.');
            break;
        }
        // Retrieve the subscription object using the ID from the checkout session
        const subscription = await stripe.subscriptions.retrieve(data.subscription);
        
        // Update DB with new subscription details
        await updateSubscriptionStatus(orgsCollection, orgIdCheckout, subscription);
        await billingLogsCollection.insertOne({ orgId: orgIdCheckout, sessionId: data.id, status: 'completed', createdAt: new Date() });
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const orgIdSub = data.metadata?.orgId || (await stripe.customers.retrieve(data.customer)).metadata?.orgId;
        if (!orgIdSub) break;
        
        await updateSubscriptionStatus(orgsCollection, orgIdSub, data);
        await billingLogsCollection.insertOne({ orgId: orgIdSub, subscriptionId: data.id, status: data.status, eventType: event.type, createdAt: new Date() });
        break;
      
      case 'invoice.payment_succeeded':
        const orgIdInv = data.metadata?.orgId || (await stripe.customers.retrieve(data.customer)).metadata?.orgId;
        if (!orgIdInv) break;

        await billingInvoicesCollection.insertOne({
          orgId: orgIdInv,
          amountPaid: data.amount_paid,
          currency: data.currency,
          invoicePdf: data.invoice_pdf,
          status: 'paid',
          createdAt: new Date(),
        });
        break;
      
      case 'invoice.payment_failed':
        const orgIdFail = data.metadata?.orgId || (await stripe.customers.retrieve(data.customer)).metadata?.orgId;
        if (!orgIdFail) break;
        
        await billingInvoicesCollection.insertOne({
          orgId: orgIdFail,
          amountDue: data.amount_due,
          status: 'payment_failed',
          createdAt: new Date(),
        });
        break;
      
      default:
        // Handled below
        break;
    }

    // Always return 200 OK to Stripe immediately after processing event
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed during DB operation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

