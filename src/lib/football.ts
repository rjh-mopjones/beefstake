import "server-only";

// Minimal slice of the football-data.org v4 match shape that we rely on.
export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED";

export type MatchStage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type ApiTeam = {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
};

export type ApiMatch = {
  id: number;
  utcDate: string;
  status: MatchStatus;
  stage: MatchStage;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    // Note: fullTime folds in the penalty shootout result (e.g. a 1-1 that
    // ends 7-6), so `penalties` is needed to recover the on-pitch score.
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null } | null;
  };
};

const BASE = "https://api.football-data.org/v4";
const WORLD_CUP = "WC"; // football-data competition code for the World Cup

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }

  const res = await fetch(`${BASE}/competitions/${WORLD_CUP}/matches`, {
    headers: { "X-Auth-Token": key },
    // Re-fetch at most once a minute; stays well inside the free-tier limit.
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { matches?: ApiMatch[] };
  return data.matches ?? [];
}
