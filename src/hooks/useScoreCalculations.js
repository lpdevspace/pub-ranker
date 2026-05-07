import { useMemo } from 'react';

/**
 * useScoreCalculations
 * Converts the flat rawScores array into the nested scoreMap object.
 * Memoised so it only recomputes when rawScores actually changes,
 * preventing unnecessary recalculations on unrelated state updates.
 *
 * scoreMap shape: { [pubId]: { [criterionId]: [scoreEntry, ...] } }
 */
export default function useScoreCalculations(rawScores) {
    const scores = useMemo(() => {
        const scoreMap = {};
        for (const d of rawScores) {
            if (!scoreMap[d.pubId]) scoreMap[d.pubId] = {};
            if (!scoreMap[d.pubId][d.criterionId]) scoreMap[d.pubId][d.criterionId] = [];
            scoreMap[d.pubId][d.criterionId].push(d);
        }
        return scoreMap;
    }, [rawScores]);

    return scores;
}
