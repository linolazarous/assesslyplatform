// api/controllers/healthController.js
import mongoose from 'mongoose';

export const dbHealth = async (req, res) => {
  try {
    const conn = mongoose.connection;

    // Basic Mongoose state
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = conn.readyState;

    // Perform an admin ping to ensure DB responds
    // This uses the underlying native driver DB object
    const adminDb = conn.db.admin ? conn.db.admin() : null;
    let pingResult = null;

    if (adminDb && typeof adminDb.ping === 'function') {
      pingResult = await adminDb.ping();
    } else {
      // Fallback: try a collections list
      await conn.db.listCollections().toArray();
      pingResult = { ok: 1 };
    }

    // Optional lightweight metrics
    const collections = await conn.db.listCollections().toArray();
    const collectionCount = collections.length;

    return res.status(200).json({
      success: true,
      message: 'Database connection healthy',
      data: {
        mongooseState: readyState,
        ping: pingResult,
        collections: collectionCount,
        host: conn?.host || null,
        name: conn?.name || null
      }
    });
  } catch (err) {
    console.error('DB health check failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Database health check failed',
      error: err.message
    });
  }
};
