import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PlayerStat {
  average: number;
  roundsPlayed: number;
}

/**
 * Calculate a player's "score to beat" - their 6-game average rounded to nearest whole number
 * Returns "New" if player has fewer than 6 rounds
 */
export function getPlayerScoreToBeat(playerStat?: PlayerStat): string {
  if (!playerStat || playerStat.roundsPlayed < 6) {
    return "New";
  }
  return Math.round(playerStat.average).toString();
}

/**
 * Calculate a group's "score to beat" - average of all players' individual scores to beat
 * Returns null if any player is "New" or if group is empty
 */
export function getGroupScoreToBeat(
  playerIds: string[],
  playerStatsMap: Record<string, PlayerStat>
): string | null {
  if (playerIds.length === 0) return null;

  const validStats: number[] = [];

  for (const playerId of playerIds) {
    const stat = playerStatsMap[playerId];
    if (!stat || stat.roundsPlayed < 6) {
      // If any player is "New", we can't calculate a group score
      return null;
    }
    validStats.push(stat.average);
  }

  if (validStats.length === 0) return null;

  const groupAverage = validStats.reduce((sum, avg) => sum + avg, 0) / validStats.length;
  return Math.round(groupAverage).toString();
}
