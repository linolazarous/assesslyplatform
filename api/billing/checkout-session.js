import connectToDatabase from '../../src/utils/mongo.jsx'; // Corrected path/extension
import { stripe } from '../../src/utils/stripe.jsx'; // FIX: Named import + corrected extension
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Standard response for wrong method
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Ensure token exists and is correctly parsed
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { orgId, priceId, successUrl, cancelUrl } = req.body;
    
    // 1. Authenticate and authorize the user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 2. Fetch organization and validate ownership
    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');
    // Ensure the orgId is a valid ObjectId before querying
    const orgDoc = await orgsCollection.findOne({ _id: new ObjectId(orgId) });

    if (!orgDoc) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    // Security check: Validate user has permission (e.g., is owner)
    if (orgDoc.ownerId !== userId) {
      return res.status(403).json({ message: 'Permission denied: User is not the organization owner.' });
    }
    
    // Ensure the organization has a Stripe Customer ID for subscription handling
    if (!orgDoc.stripeCustomerId) {
      // NOTE: In a real app, you would create the customer here if missing.
      return res.status(400).json({ message: 'Organization billing profile is missing a Stripe Customer ID.' });
    }

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // Using subscription mode for recurring billing
      customer: orgDoc.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      
      // Pass the session ID back to the success URL
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: cancelUrl,
      
      // Metadata for webhook handling
      metadata: { orgId, userId },
      subscription_data: { metadata: { orgId } }
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    // Handle JWT/Validation errors separately
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
    
    console.error('Checkout session creation failed:', error);
    return res.status(500).json({ message: 'Failed to create checkout session due to server error.' });
  }
}
