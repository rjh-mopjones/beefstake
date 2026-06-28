import {
  ALL_TEAMS,
  ENTRANTS,
  FIRST_RED_CARD_TEAM_CODE,
  entrantByTeamCode,
  type Team,
} from "./draw";
import type { ApiMatch, ApiTeam } from "./football";

// ---- team-name matching -------------------------------------------------

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const codeSet = new Set(ALL_TEAMS.map((t) => t.code));
const aliasIndex = new Map<string, string>(); // normalized alias -> FIFA code
for (const t of ALL_TEAMS) {
  for (const alias of t.aliases) aliasIndex.set(normalize(alias), t.code);
}

/** Resolve a football-data team to our FIFA code, or null if unmatched. */
function resolveCode(api: ApiTeam): string | null {
  if (api.tla && codeSet.has(api.tla)) return api.tla;
  for (const candidate of [api.name, api.shortName]) {
    if (candidate) {
      const code = aliasIndex.get(normalize(candidate));
      if (code) return code;
    }
  }
  return null;
}

// ---- computed shapes ----------------------------------------------------

export type TeamStatus = "in" | "out" | "champion";

export type TeamLine = {
  code: string;
  name: string;
  flag: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  points: number;
  status: TeamStatus;
};

export type EntrantStanding = {
  rank: number;
  name: string;
  teams: TeamLine[];
  goals: number; // combined goals across all three teams
  alive: number; // teams not yet eliminated
};

export type PrizeState = {
  winner: { entrant: string; team: TeamLine } | null;
  mostGoals: { goals: number; holders: { entrant: string }[] };
  firstRedCard: { entrant: string; team: TeamLine } | null;
};

export type MatchSide = {
  code: string | null;
  name: string;
  flag: string | null;
  owner: string | null;
  goals: number | null;
};

export type MatchLine = {
  id: number;
  status: ApiMatch["status"];
  stage: ApiMatch["stage"];
  group: string | null;
  utcDate: string;
  live: boolean;
  home: MatchSide;
  away: MatchSide;
};

export type Standings = {
  entrants: EntrantStanding[];
  prizes: PrizeState;
  matches: { live: MatchLine[]; recent: MatchLine[]; upcoming: MatchLine[] };
  lastUpdated: string;
  unmatched: string[]; // API team names we couldn't map (for debugging)
};

const KNOCKOUT_STAGES = new Set([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

const teamByCode = new Map<string, Team>(ALL_TEAMS.map((t) => [t.code, t]));

// ---- the computation ----------------------------------------------------

export function computeStandings(matches: ApiMatch[]): Standings {
  type Mut = Omit<TeamLine, "code" | "name" | "flag" | "status"> & {
    eliminated: boolean;
    champion: boolean;
  };
  const stats = new Map<string, Mut>();
  const unmatched = new Set<string>();

  const blank = (): Mut => ({
    played: 0,
    w: 0,
    d: 0,
    l: 0,
    gf: 0,
    ga: 0,
    points: 0,
    eliminated: false,
    champion: false,
  });
  for (const t of ALL_TEAMS) stats.set(t.code, blank());

  const codeOf = (api: ApiTeam): string | null => {
    const code = resolveCode(api);
    if (!code && api.name) unmatched.add(api.name);
    return code;
  };

  for (const m of matches) {
    const homeCode = codeOf(m.homeTeam);
    const awayCode = codeOf(m.awayTeam);
    const hg = m.score.fullTime.home;
    const ag = m.score.fullTime.away;
    const hasGoals = hg !== null && ag !== null;
    const finished = m.status === "FINISHED";

    // Goals count as soon as they're on the board (live or finished).
    if (hasGoals) {
      if (homeCode) {
        const s = stats.get(homeCode)!;
        s.gf += hg!;
        s.ga += ag!;
      }
      if (awayCode) {
        const s = stats.get(awayCode)!;
        s.gf += ag!;
        s.ga += hg!;
      }
    }

    // Records, points and knockout elimination only once a match is final.
    if (finished && hasGoals) {
      const home = homeCode ? stats.get(homeCode)! : null;
      const away = awayCode ? stats.get(awayCode)! : null;
      if (home) home.played += 1;
      if (away) away.played += 1;

      const knockout = KNOCKOUT_STAGES.has(m.stage);
      if (hg! > ag!) {
        if (home) {
          home.w += 1;
          home.points += 3;
        }
        if (away) {
          away.l += 1;
          if (knockout) away.eliminated = true;
        }
      } else if (ag! > hg!) {
        if (away) {
          away.w += 1;
          away.points += 3;
        }
        if (home) {
          home.l += 1;
          if (knockout) home.eliminated = true;
        }
      } else {
        if (home) {
          home.d += 1;
          home.points += 1;
        }
        if (away) {
          away.d += 1;
          away.points += 1;
        }
      }

      if (m.stage === "FINAL") {
        const winCode =
          m.score.winner === "HOME_TEAM"
            ? homeCode
            : m.score.winner === "AWAY_TEAM"
              ? awayCode
              : null;
        if (winCode) stats.get(winCode)!.champion = true;
      }
    }
  }

  // Group-stage elimination: once the knockout bracket is drawn, the teams in
  // it are exactly the survivors. We read that off the fixtures rather than
  // recomputing group tables (and their tiebreakers) ourselves, so every team
  // that didn't make the cut is marked out.
  const knockoutParticipants = new Set<string>();
  for (const m of matches) {
    if (!KNOCKOUT_STAGES.has(m.stage)) continue;
    const h = resolveCode(m.homeTeam);
    const a = resolveCode(m.awayTeam);
    if (h) knockoutParticipants.add(h);
    if (a) knockoutParticipants.add(a);
  }
  if (knockoutParticipants.size > 0) {
    for (const [code, s] of stats) {
      if (!knockoutParticipants.has(code)) s.eliminated = true;
    }
  }

  const lineFor = (code: string): TeamLine => {
    const t = teamByCode.get(code)!;
    const s = stats.get(code)!;
    const status: TeamStatus = s.champion
      ? "champion"
      : s.eliminated
        ? "out"
        : "in";
    return {
      code,
      name: t.name,
      flag: t.flag,
      played: s.played,
      w: s.w,
      d: s.d,
      l: s.l,
      gf: s.gf,
      ga: s.ga,
      points: s.points,
      status,
    };
  };

  // Per-entrant standings.
  const entrants: EntrantStanding[] = ENTRANTS.map((e) => {
    const teams = e.teams.map((t) => lineFor(t.code));
    return {
      rank: 0,
      name: e.name,
      teams,
      // Headline number is the combined goals across all three teams.
      goals: teams.reduce((sum, t) => sum + t.gf, 0),
      alive: teams.filter((t) => t.status !== "out").length,
    };
  });
  entrants.sort(
    (a, b) =>
      b.goals - a.goals ||
      b.alive - a.alive ||
      a.name.localeCompare(b.name),
  );
  entrants.forEach((e, i) => (e.rank = i + 1));

  // Prizes.
  const allLines = ALL_TEAMS.map((t) => lineFor(t.code));

  const champ = allLines.find((t) => t.status === "champion");
  const winner = champ
    ? { entrant: entrantByTeamCode(champ.code)!.name, team: champ }
    : null;

  // Awarded to the entrant whose combined goals across all three teams is
  // highest — not a single team's tally.
  const maxGoals = entrants.reduce((max, e) => Math.max(max, e.goals), 0);
  const mostGoals = {
    goals: maxGoals,
    holders:
      maxGoals > 0
        ? entrants
            .filter((e) => e.goals === maxGoals)
            .map((e) => ({ entrant: e.name }))
        : [],
  };

  const redLine = FIRST_RED_CARD_TEAM_CODE
    ? allLines.find((t) => t.code === FIRST_RED_CARD_TEAM_CODE)
    : undefined;
  const firstRedCard = redLine
    ? { entrant: entrantByTeamCode(redLine.code)!.name, team: redLine }
    : null;

  // Match lists.
  const sideFor = (api: ApiTeam, goals: number | null): MatchSide => {
    const code = resolveCode(api);
    const t = code ? teamByCode.get(code) : undefined;
    return {
      code: code ?? null,
      name: t?.name ?? api.name ?? api.tla ?? "TBD",
      flag: t?.flag ?? null,
      owner: code ? (entrantByTeamCode(code)?.name ?? null) : null,
      goals,
    };
  };
  const toLine = (m: ApiMatch): MatchLine => ({
    id: m.id,
    status: m.status,
    stage: m.stage,
    group: m.group,
    utcDate: m.utcDate,
    live: m.status === "IN_PLAY" || m.status === "PAUSED",
    home: sideFor(m.homeTeam, m.score.fullTime.home),
    away: sideFor(m.awayTeam, m.score.fullTime.away),
  });

  const live = matches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED").map(toLine);
  const recent = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .map(toLine);
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED")
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .map(toLine);

  return {
    entrants,
    prizes: { winner, mostGoals, firstRedCard },
    matches: { live, recent, upcoming },
    lastUpdated: new Date().toISOString(),
    unmatched: [...unmatched],
  };
}
