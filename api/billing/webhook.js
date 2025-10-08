import connectToDatabase from '../../../src/utils/mongo';
import { stripe } from '../../../src/utils/stripe';
import { getPlanFromPriceId, updateSubscriptionStatus } from '../../../src/utils/billing-helpers'; // You'll create this helper file

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

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

  try {
    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');
    const billingLogsCollection = db.collection('billingLogs');
    const billingInvoicesCollection = db.collection('billingInvoices');

    const data = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed':
        const orgId = data.metadata.orgId;
        const subscription = await stripe.subscriptions.retrieve(data.subscription);
        await updateSubscriptionStatus(orgsCollection, orgId, subscription);
        await billingLogsCollection.insertOne({ orgId, sessionId: data.id, status: 'completed' });
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const customer = await stripe.customers.retrieve(data.customer);
        const orgIdFromCustomer = customer.metadata.orgId;
        await updateSubscriptionStatus(orgsCollection, orgIdFromCustomer, data);
        break;
      
      case 'invoice.payment_succeeded':
        const customerInv = await stripe.customers.retrieve(data.customer);
        const orgIdFromInv = customerInv.metadata.orgId;
        await billingInvoicesCollection.insertOne({
          orgId: orgIdFromInv,
          amountPaid: data.amount_paid,
          currency: data.currency,
          invoicePdf: data.invoice_pdf,
          status: 'paid',
          createdAt: new Date(),
        });
        break;
      
      case 'invoice.payment_failed':
        const customerFailInv = await stripe.customers.retrieve(data.customer);
        const orgIdFail = customerFailInv.metadata.orgId;
        await billingInvoicesCollection.insertOne({
          orgId: orgIdFail,
          amountDue: data.amount_due,
          status: 'payment_failed',
          createdAt: new Date(),
        });
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper to get raw body for signature verification
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
