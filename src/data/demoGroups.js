/**
 * Demo public groups — shown on the landing page when there are no real
 * `groups` documents flagged isPublic in Firestore yet.
 *
 * Once real public groups exist, these fall away automatically (see
 * PublicLandingPage's fallback logic).
 *
 * Marked with __isDemo=true so we can disable the "preview" click handler
 * for them (they don't exist in Firestore so the modal would 404).
 */

export const DEMO_PUBLIC_GROUPS = [
    {
        id: '__demo_london',
        groupName: 'London Locals',
        city: 'London',
        members: Array(18).fill(null),
        pubCount: 42,
        coverPhoto: null,
        topPubs: [
            { name: 'The Churchill Arms', area: 'Notting Hill', score: 9.4 },
            { name: 'The Mayflower',      area: 'Rotherhithe',   score: 9.1 },
            { name: 'The Black Friar',    area: 'Blackfriars',   score: 8.9 },
        ],
        __isDemo: true,
    },
    {
        id: '__demo_manchester',
        groupName: 'Manc Pint Club',
        city: 'Manchester',
        members: Array(12).fill(null),
        pubCount: 31,
        coverPhoto: null,
        topPubs: [
            { name: 'Peveril of the Peak', area: 'Bridgewater',  score: 9.2 },
            { name: 'The Briton\'s Protection', area: 'Castlefield', score: 9.0 },
            { name: 'The Marble Arch',     area: 'Northern Quarter', score: 8.7 },
        ],
        __isDemo: true,
    },
    {
        id: '__demo_bristol',
        groupName: 'Bristol Beer Hunters',
        city: 'Bristol',
        members: Array(9).fill(null),
        pubCount: 24,
        coverPhoto: null,
        topPubs: [
            { name: 'The Coronation Tap',  area: 'Clifton',     score: 9.3 },
            { name: 'The Eldon House',     area: 'Clifton',     score: 8.8 },
            { name: 'Small Bar',           area: 'King Street', score: 8.6 },
        ],
        __isDemo: true,
    },
    {
        id: '__demo_edinburgh',
        groupName: 'Edinburgh Auld Reekie',
        city: 'Edinburgh',
        members: Array(15).fill(null),
        pubCount: 38,
        coverPhoto: null,
        topPubs: [
            { name: 'The Sheep Heid Inn',  area: 'Duddingston', score: 9.5 },
            { name: 'Sandy Bell\'s',       area: 'Old Town',    score: 9.0 },
            { name: 'The Bow Bar',         area: 'Grassmarket', score: 8.9 },
        ],
        __isDemo: true,
    },
    {
        id: '__demo_leeds',
        groupName: 'Leeds Real Ale Society',
        city: 'Leeds',
        members: Array(7).fill(null),
        pubCount: 19,
        coverPhoto: null,
        topPubs: [
            { name: 'Whitelock\'s Ale House', area: 'City Centre', score: 9.1 },
            { name: 'The Grove Inn',         area: 'Holbeck',     score: 8.8 },
            { name: 'Friends of Ham',        area: 'New Station St', score: 8.5 },
        ],
        __isDemo: true,
    },
];

export default DEMO_PUBLIC_GROUPS;
