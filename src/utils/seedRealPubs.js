import { firebase } from '../firebase';
import {
    SAMPLE_PUBS,
    SAMPLE_CRITERIA,
    SAMPLE_RAW_SCORES,
    SAMPLE_CRAWLS
} from '../data/sampleTavernData';

/**
 * Seeds an active Firestore group with authentic UK pub data, standard criteria,
 * sample member ratings, and walking crawls.
 */
export async function seedGroupWithRealPubs({ db, groupId, groupRef, user }) {
    if (!db || !groupId || !groupRef) {
        throw new Error('Database or active group reference missing.');
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const currentUserId = user?.uid || 'community-member';
    const currentUserName = user?.displayName || user?.email?.split('@')[0] || 'Tavern Member';

    // 1. Seed Criteria
    const criteriaBatch = db.batch();
    for (const crit of SAMPLE_CRITERIA) {
        const critDocRef = groupRef.collection('criteria').doc(crit.id);
        criteriaBatch.set(critDocRef, {
            name: crit.name,
            type: crit.type,
            weight: crit.weight || 1.0,
            archived: false,
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
    }
    await criteriaBatch.commit();

    // 2. Seed Pubs
    const pubsBatch = db.batch();
    for (const pub of SAMPLE_PUBS) {
        const pubDocRef = groupRef.collection('pubs').doc(pub.id);
        pubsBatch.set(pubDocRef, {
            name: pub.name,
            location: pub.location,
            address: pub.address,
            lat: pub.lat,
            lng: pub.lng,
            photoURL: pub.photoURL,
            pintPrice: pub.pintPrice,
            status: pub.status || 'visited',
            busyStatus: pub.busyStatus || 'lively',
            ratingCount: pub.status === 'visited' ? 4 : 0,
            amenities: pub.amenities || { isDogFriendly: true, hasBeerGarden: true, servesFood: true },
            openingHours: pub.openingHours || 'Mo-Th 12:00-23:00; Fr-Sa 12:00-00:00; Su 12:00-22:30',
            operator: pub.operator || 'Independent Pub',
            phone: pub.phone || '',
            website: pub.website || '',
            realAle: pub.realAle || true,
            streetViewHeading: pub.streetViewHeading || 180,
            vibeSummary: pub.vibeSummary || '',
            addedBy: currentUserId,
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
    }
    await pubsBatch.commit();

    // 3. Seed Scores / Ratings
    const scoresBatch = db.batch();
    for (const score of SAMPLE_RAW_SCORES) {
        const scoreDocRef = groupRef.collection('scores').doc();
        scoresBatch.set(scoreDocRef, {
            pubId: score.pubId,
            criterionId: score.criterionId,
            userId: score.userId || currentUserId,
            userName: score.userName || currentUserName,
            value: score.value,
            createdAt: now,
        });
    }
    await scoresBatch.commit();

    // 4. Seed Sample Crawls
    const crawlBatch = db.batch();
    for (const crawl of SAMPLE_CRAWLS) {
        const crawlDocRef = db.collection('crawls').doc();
        crawlBatch.set(crawlDocRef, {
            name: crawl.name,
            description: crawl.description || 'Curated historic tavern walking trail.',
            groupId,
            createdBy: currentUserId,
            createdByName: currentUserName,
            pubIds: crawl.pubIds || ['pub-2', 'pub-4', 'pub-3'],
            stopsCount: crawl.stopsCount || 3,
            createdAt: now,
            updatedAt: now,
        });
    }
    await crawlBatch.commit();

    // 5. Seed Activities for Taproom
    const actBatch = db.batch();
    const act1Ref = groupRef.collection('activities').doc();
    actBatch.set(act1Ref, {
        type: 'rating',
        userName: currentUserName,
        userId: currentUserId,
        pubName: 'Ye Olde Cheshire Cheese',
        ratingCount: 5,
        timestamp: now,
    });
    const act2Ref = groupRef.collection('activities').doc();
    actBatch.set(act2Ref, {
        type: 'crawl',
        userName: currentUserName,
        userId: currentUserId,
        pubCount: 4,
        timestamp: now,
    });
    await actBatch.commit();

    // 6. Update Group Document
    try {
        await groupRef.update({
            pubCount: SAMPLE_PUBS.length,
            updatedAt: now,
        });
    } catch (err) {
        console.warn('Could not update group pubCount metadata:', err);
    }

    return {
        pubsCount: SAMPLE_PUBS.length,
        criteriaCount: SAMPLE_CRITERIA.length,
        scoresCount: SAMPLE_RAW_SCORES.length,
    };
}
