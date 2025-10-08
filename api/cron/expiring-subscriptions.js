import connectToDatabase from '../../../src/utils/mongo';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');
    const notifsCollection = db.collection('notifications');

    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const orgs = await orgsCollection.find({
      'subscription.currentPeriodEnd': { $lte: threshold },
      'subscription.status': 'active',
    }).toArray();

    for (const org of orgs) {
      console.log(`Sending renewal reminder to org ${org._id}`);
      await notifsCollection.insertOne({
        orgId: org._id,
        type: 'subscription_renewal_reminder',
        message: `Your subscription will renew soon!`,
        createdAt: new Date(),
        read: false,
      });
    }

    console.log(`Processed ${orgs.length} expiring subscriptions`);
    return res.status(200).json({ message: `Processed ${orgs.length} expiring subscriptions` });
  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
