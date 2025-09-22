import connectToDatabase from '../../../src/utils/mongo';
import { stripe } from '../../../src/utils/stripe';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { orgId, priceId, successUrl, cancelUrl } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');
    const orgDoc = await orgsCollection.findOne({ _id: new ObjectId(orgId) });

    // Security: Validate user has access to this org
    if (!orgDoc || orgDoc.ownerId !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    if (!orgDoc.stripeCustomerId) {
      return res.status(400).json({ message: 'Organization not properly configured' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: orgDoc.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { orgId, userId },
      subscription_data: { metadata: { orgId } }
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Checkout session creation failed', error);
    return res.status(500).json({ message: 'Failed to create checkout session' });
  }
}
