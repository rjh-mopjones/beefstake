"use client";

import { useCallback, useEffect, useState } from "react";
import { PRIZES } from "@/lib/draw";
import type {
  MatchLine,
  Standings,
  TeamLine,
  TeamStatus,
} from "@/lib/standings";

const REFRESH_MS = 60_000;

function useStandings() {
  const [data, setData] = useState<Standings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/standings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as Standings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Polling an external API on mount is the sanctioned external-sync use;
    // setState only fires after the awaited fetch, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, error, loading, reload: load };
}

const STATUS_STYLE: Record<TeamStatus, string> = {
  in: "text-zinc-300",
  out: "text-zinc-600 line-through",
  champion: "text-amber-400 font-semibold",
};

function TeamPill({ team }: { team: TeamLine }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${STATUS_STYLE[team.status]}`}
      title={`P${team.played} ${team.w}-${team.d}-${team.l} · ${team.gf} GF`}
    >
      <span>{team.flag}</span>
      <span>{team.name}</span>
      <span className="text-emerald-500">{team.gf}</span>
      {team.status === "champion" && <span>🏆</span>}
    </span>
  );
}

function PrizeCard({
  emoji,
  label,
  amount,
  children,
}: {
  emoji: string;
  label: string;
  amount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          {emoji} {label}
        </span>
        <span className="font-bold text-emerald-400">£{amount}</span>
      </div>
      <div className="mt-3 text-lg">{children}</div>
    </div>
  );
}

function MatchRow({ m }: { m: MatchLine }) {
  const score =
    m.home.goals !== null && m.away.goals !== null
      ? `${m.home.goals} – ${m.away.goals}`
      : "v";
  const when =
    m.status === "SCHEDULED" || m.status === "TIMED"
      ? new Date(m.utcDate).toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-800 py-2 text-sm">
      <div className="flex-1 text-right">
        {m.home.flag} {m.home.name}
        {m.home.owner && (
          <span className="ml-1 text-xs text-zinc-500">({m.home.owner})</span>
        )}
      </div>
      <div
        className={`shrink-0 rounded px-2 py-0.5 font-mono ${
          m.live ? "bg-red-500/20 text-red-300" : "bg-zinc-800 text-zinc-200"
        }`}
      >
        {m.live && <span className="mr-1 animate-pulse">●</span>}
        {when ?? score}
      </div>
      <div className="flex-1 text-left">
        {m.away.owner && (
          <span className="mr-1 text-xs text-zinc-500">({m.away.owner})</span>
        )}
        {m.away.name} {m.away.flag}
      </div>
    </div>
  );
}

export default function Home() {
  const { data, error, loading } = useStandings();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-black tracking-tight">
          beef<span className="text-emerald-500">stake</span>
        </h1>
        <p className="mt-2 text-zinc-400">
          World Cup 2026 — live scores &amp; who&apos;s winning the sweepstake.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          Couldn&apos;t load live data: {error}
        </div>
      )}
      {loading && !data && (
        <p className="text-center text-zinc-500">Loading live data…</p>
      )}

      {data && (
        <>
          {/* Prizes */}
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <PrizeCard {...PRIZES.winner}>
              {data.prizes.winner ? (
                <span>
                  <span className="font-bold">{data.prizes.winner.entrant}</span>{" "}
                  <span className="text-zinc-400">
                    {data.prizes.winner.team.flag} {data.prizes.winner.team.name}
                  </span>
                </span>
              ) : (
                <span className="text-zinc-500">TBD — decided in the final</span>
              )}
            </PrizeCard>

            <PrizeCard {...PRIZES.goals}>
              {data.prizes.mostGoals.holders.length > 0 ? (
                <div>
                  <div className="text-sm text-zinc-400">
                    {data.prizes.mostGoals.goals} goals
                    {data.prizes.mostGoals.holders.length > 1 && " (tied)"}
                  </div>
                  {data.prizes.mostGoals.holders.map((h) => (
                    <div key={h.team.code}>
                      <span className="font-bold">{h.entrant}</span>{" "}
                      <span className="text-zinc-400">
                        {h.team.flag} {h.team.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-zinc-500">No goals yet</span>
              )}
            </PrizeCard>

            <PrizeCard {...PRIZES.redCard}>
              {data.prizes.firstRedCard ? (
                <span>
                  <span className="font-bold">
                    {data.prizes.firstRedCard.entrant}
                  </span>{" "}
                  <span className="text-zinc-400">
                    {data.prizes.firstRedCard.team.flag}{" "}
                    {data.prizes.firstRedCard.team.name}
                  </span>
                </span>
              ) : (
                <span className="text-zinc-500">TBD — set manually</span>
              )}
            </PrizeCard>
          </section>

          {/* Live matches */}
          {data.matches.live.length > 0 && (
            <section className="mb-8 rounded-2xl border border-red-900/60 bg-red-950/20 p-4">
              <h2 className="mb-1 text-sm font-semibold text-red-300">
                ● Live now
              </h2>
              {data.matches.live.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </section>
          )}

          {/* Leaderboard */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Leaderboard</h2>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Entrant</th>
                    <th className="px-3 py-3">Teams (goals)</th>
                    <th className="px-3 py-3 text-right">Top team</th>
                    <th className="px-3 py-3 text-right">Pts</th>
                    <th className="px-3 py-3 text-right">Alive</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entrants.map((e) => (
                    <tr
                      key={e.name}
                      className="border-t border-zinc-800 odd:bg-zinc-900/30"
                    >
                      <td className="px-3 py-3 text-zinc-500">{e.rank}</td>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">
                        {e.name}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {e.teams.map((t) => (
                            <TeamPill key={t.code} team={t} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-400">
                        {e.goals}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300">
                        {e.points}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300">
                        {e.alive}/3
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              &ldquo;Top team&rdquo; is the goals of each entrant&apos;s
              best-scoring team (the £40 prize). Ranked by that, then points,
              then teams still alive.
            </p>
          </section>

          {/* Results & fixtures */}
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 p-4">
              <h2 className="mb-1 text-sm font-semibold text-zinc-400">
                Recent results
              </h2>
              {data.matches.recent.length > 0 ? (
                data.matches.recent.map((m) => <MatchRow key={m.id} m={m} />)
              ) : (
                <p className="py-2 text-sm text-zinc-600">
                  No matches played yet.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800 p-4">
              <h2 className="mb-1 text-sm font-semibold text-zinc-400">
                Upcoming
              </h2>
              {data.matches.upcoming.length > 0 ? (
                data.matches.upcoming.map((m) => <MatchRow key={m.id} m={m} />)
              ) : (
                <p className="py-2 text-sm text-zinc-600">
                  No fixtures scheduled.
                </p>
              )}
            </div>
          </section>

          <footer className="mt-8 text-center text-xs text-zinc-600">
            Updated {new Date(data.lastUpdated).toLocaleTimeString()} · refreshes
            every 60s
            {data.unmatched.length > 0 && (
              <span className="block text-amber-700">
                Unmatched teams: {data.unmatched.join(", ")}
              </span>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
