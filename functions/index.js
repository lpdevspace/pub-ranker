/**
 * onScoreCreate — Cloud Function (Node 18)
 *
 * Triggered every time a new score document is created anywhere in
 * Firestore (both group-scoped and global score sub-collections).
 *
 * It writes /rateLimits/{userId} via the Admin SDK, which bypasses
 * all client-facing Firestore Security Rules. This means the client
 * can NEVER reset or forge `lastScoreAt` — the rate-limit cooldown
 * is entirely server-controlled.
 *
 * Deploy:
 *   firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helper — write the rate-limit doc for a given userId.
// Uses set() with merge:true so it works whether the doc exists or not.
// ---------------------------------------------------------------------------
async function writeRateLimit(userId, context) {
  if (!userId) {
    console.warn('onScoreCreate: score document has no userId field — skipping rate limit write.');
    return null;
  }

  const rateLimitRef = db.collection('rateLimits').doc(userId);

  await rateLimitRef.set(
    {
      lastScoreAt: admin.firestore.FieldValue.serverTimestamp(),
      // Keep a running count for analytics (optional but free to store).
      totalScores: admin.firestore.FieldValue.increment(1),
    },
    { merge: true }
  );

  console.log(`rateLimits/${userId} updated via Admin SDK for score at path: ${context.resource.name}`);
  return null;
}

// ---------------------------------------------------------------------------
// Trigger 1: Group-scoped scores
//   /groups/{groupId}/scores/{scoreId}
// ---------------------------------------------------------------------------
exports.onGroupScoreCreate = functions
  .region('europe-west2') // London — closest region to your Wolverhampton users
  .firestore
  .document('groups/{groupId}/scores/{scoreId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return writeRateLimit(data.userId, context);
  });

// ---------------------------------------------------------------------------
// Trigger 2: Global / pub-level scores
//   /pubs/{pubId}/scores/{scoreId}  (or any other top-level scores sub-collection)
// ---------------------------------------------------------------------------
exports.onGlobalScoreCreate = functions
  .region('europe-west2')
  .firestore
  .document('pubs/{pubId}/scores/{scoreId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return writeRateLimit(data.userId, context);
  });
