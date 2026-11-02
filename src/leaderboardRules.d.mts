

export type ActivityWindowFlags = {
  active7: boolean;
  active30: boolean;
  lastActivity: string;
};
export function activityWindowFlags(activityDays: unknown, currentDay: string): ActivityWindowFlags;
export function leaderboardWindowEligible(mode: string, flags: Partial<ActivityWindowFlags>): boolean;
