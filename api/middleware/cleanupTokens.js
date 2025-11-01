// api/utils/cleanupTokens.js
import RefreshToken from '../models/RefreshToken.js';

export async function removeExpiredTokens() {
  try {
    const res = await RefreshToken.deleteMany({ expires: { $lt: new Date() } });
    console.log(`Removed ${res.deletedCount} expired refresh tokens`);
  } catch (err) {
    console.error('Failed to cleanup tokens', err);
  }
}
