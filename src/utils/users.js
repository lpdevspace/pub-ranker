/**
 * getUserDisplayName
 * Single source of truth for resolving a user's display name.
 * Priority: nickname → displayName → email → 'Unknown User'
 *
 * @param {string} uid - The user's Firebase UID
 * @param {Object} allUsers - Map of uid → user profile object
 * @returns {string}
 */
export function getUserDisplayName(uid, allUsers) {
    const user = allUsers?.[uid];
    if (!user) return 'Unknown User';
    return user.nickname || user.displayName || user.email || 'Unknown User';
}

/**
 * getUserInitial
 * Returns the first character of the display name, uppercased.
 *
 * @param {string} uid
 * @param {Object} allUsers
 * @returns {string}
 */
export function getUserInitial(uid, allUsers) {
    return getUserDisplayName(uid, allUsers).charAt(0).toUpperCase();
}

/**
 * getUserAvatar
 * Returns the avatarUrl for a user, or null if not set.
 *
 * @param {string} uid
 * @param {Object} allUsers
 * @returns {string|null}
 */
export function getUserAvatar(uid, allUsers) {
    return allUsers?.[uid]?.avatarUrl || null;
}
