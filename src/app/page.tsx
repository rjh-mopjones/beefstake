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
      const res = await fetch("/api/standings", { cache: "no-store" });
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

  return { data, error, loading };
}

const STATUS_STYLE: Record<TeamStatus, string> = {
  in: "text-ink",
  out: "text-ink-soft line-through decoration-red/70",
  champion: "text-gold font-semibold",
};

function Selection({ team }: { team: TeamLine }) {
  return (
    <span
      className={`grid grid-cols-[1.5em_1fr_1.4em] items-baseline gap-2 not-italic ${STATUS_STYLE[team.status]}`}
      title={`Played ${team.played} · ${team.w}-${team.d}-${team.l} · ${team.gf} goals`}
    >
      <span className="text-center">{team.flag}</span>
      <span className="truncate tracking-wide">
        {team.name}
        {team.status === "champion" && " ♚"}
      </span>
      <span className="text-right font-mono text-xs font-bold text-red">
        {team.gf}
      </span>
    </span>
  );
}

function PrizeBox({
  index,
  label,
  amount,
  children,
}: {
  index: number;
  label: string;
  amount: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rise flex flex-col border-2 border-ink bg-paper-2/60 p-4 shadow-[5px_5px_0_var(--color-ink)]"
      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
    >
      <div className="kicker border-b border-ink/40 pb-2 text-center">
        {label}
      </div>
      <div className="display my-2 text-center text-5xl text-red">£{amount}</div>
      <div className="mt-auto text-center font-serif text-[0.95rem] leading-snug">
        {children}
      </div>
    </div>
  );
}

function Fixture({ m }: { m: MatchLine }) {
  const hasScore = m.home.goals !== null && m.away.goals !== null;
  const when =
    !hasScore && (m.status === "SCHEDULED" || m.status === "TIMED")
      ? new Date(m.utcDate).toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  return (
    <div className="flex items-baseline gap-2 py-1.5 text-[0.92rem]">
      <span className="min-w-0 flex-1 truncate text-right">
        {m.home.owner && (
          <span className="mr-1 text-xs italic text-ink-soft">
            ({m.home.owner})
          </span>
        )}
        {m.home.name} {m.home.flag}
      </span>
      <span
        className={`shrink-0 font-mono text-sm font-bold ${
          m.live ? "text-red" : "text-ink"
        }`}
      >
        {hasScore ? `${m.home.goals}–${m.away.goals}` : "v"}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">
        {m.away.flag} {m.away.name}
        {m.away.owner && (
          <span className="ml-1 text-xs italic text-ink-soft">
            ({m.away.owner})
          </span>
        )}
      </span>
      {when && (
        <span className="shrink-0 font-mono text-[0.6rem] text-ink-soft">
          {when}
        </span>
      )}
    </div>
  );
}

function PaginatedFixtures({
  matches,
  empty,
  perPage = 8,
}: {
  matches: MatchLine[];
  empty: string;
  perPage?: number;
}) {
  const [page, setPage] = useState(0);

  if (matches.length === 0) {
    return <p className="py-3 font-serif italic text-ink-soft">{empty}</p>;
  }

  const pageCount = Math.ceil(matches.length / perPage);
  // Data refreshes every 60s and the list can shrink, so clamp to range.
  const current = Math.min(page, pageCount - 1);
  const start = current * perPage;
  const shown = matches.slice(start, start + perPage);

  return (
    <>
      <div className="divide-y divide-ink/15">
        {shown.map((m) => (
          <Fixture key={m.id} m={m} />
        ))}
      </div>
      {pageCount > 1 && (
        <div className="mt-2 flex items-center justify-between border-t border-ink/30 pt-2 font-mono text-[0.62rem] uppercase tracking-widest text-ink-soft">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="enabled:hover:text-red disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>
            Page {current + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
            className="enabled:hover:text-red disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const { data, error, loading } = useStandings();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="rise">
        <div className="flex items-end justify-between">
          <span className="kicker">FIFA World Cup · Can/Mex/USA</span>
          <span className="kicker">Vol. I — No. 1</span>
        </div>
        <hr className="rule-thick mt-1" />
        <h1 className="display py-3 text-center text-[clamp(3.5rem,16vw,8.5rem)]">
          Beefstake
        </h1>
        <hr className="rule" />
        <p className="py-2 text-center font-serif text-lg italic text-ink-soft">
          The Battle of The Empty Heads
        </p>
        <hr className="rule-double" />
        <div className="flex items-center justify-between py-2">
          <span className="kicker">£160 in the pot</span>
          <span className="font-mono text-[0.62rem] uppercase tracking-widest text-ink-soft">
            {data
              ? `Edition · ${new Date(data.lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Going to press…"}
          </span>
        </div>
        <hr className="rule" />
      </header>

      {error && (
        <p className="mt-6 border-2 border-red bg-red/10 p-3 text-center font-mono text-sm text-red">
          Wire service down — {error}
        </p>
      )}
      {loading && !data && (
        <p className="mt-12 text-center font-serif text-lg italic text-ink-soft">
          Setting the type…
        </p>
      )}

      {data && (
        <>
          {/* ── Prize money ──────────────────────────────────── */}
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <hr className="rule flex-1" />
              <h2 className="section-head text-xl">Prize Money</h2>
              <hr className="rule flex-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <PrizeBox index={0} label={PRIZES.winner.label} amount={PRIZES.winner.amount}>
                {data.prizes.winner ? (
                  <>
                    <span className="font-bold uppercase tracking-wide">
                      {data.prizes.winner.entrant}
                    </span>
                    <span className="block text-ink-soft">
                      {data.prizes.winner.team.flag} {data.prizes.winner.team.name}
                    </span>
                  </>
                ) : (
                  <span className="italic text-ink-soft">Decided in the final</span>
                )}
              </PrizeBox>

              <PrizeBox index={1} label={PRIZES.goals.label} amount={PRIZES.goals.amount}>
                {data.prizes.mostGoals.holders.length > 0 ? (
                  <>
                    <span className="font-mono text-xs text-ink-soft">
                      {data.prizes.mostGoals.goals} goals
                      {data.prizes.mostGoals.holders.length > 1 && " · tied"}
                    </span>
                    {data.prizes.mostGoals.holders.map((h) => (
                      <span
                        key={h.entrant}
                        className="block font-bold uppercase tracking-wide"
                      >
                        {h.entrant}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="italic text-ink-soft">No goals yet</span>
                )}
              </PrizeBox>

              <PrizeBox index={2} label={PRIZES.redCard.label} amount={PRIZES.redCard.amount}>
                {data.prizes.firstRedCard ? (
                  <>
                    <span className="font-bold uppercase tracking-wide">
                      {data.prizes.firstRedCard.entrant}
                    </span>
                    <span className="block text-ink-soft">
                      {data.prizes.firstRedCard.team.flag}{" "}
                      {data.prizes.firstRedCard.team.name}
                    </span>
                  </>
                ) : (
                  <span className="italic text-ink-soft">Awaiting the first dismissal</span>
                )}
              </PrizeBox>
            </div>
          </section>

          {/* ── Live ─────────────────────────────────────────── */}
          {data.matches.live.length > 0 && (
            <section className="rise mt-8 border-2 border-red bg-red/5 p-4">
              <div className="kicker mb-1 text-center text-red">
                <span className="blip">●</span> Live from the ground
              </div>
              <div className="divide-y divide-ink/15">
                {data.matches.live.map((m) => (
                  <Fixture key={m.id} m={m} />
                ))}
              </div>
              <div className="mt-2 border-t border-red/40 pt-2 text-center font-mono text-[0.62rem] font-bold uppercase tracking-widest text-red">
                Warning: this doesn&apos;t work at all
              </div>
            </section>
          )}

          {/* ── League table ─────────────────────────────────── */}
          <section className="rise mt-10" style={{ animationDelay: "0.3s" }}>
            <div className="mb-3 flex items-center gap-3">
              <hr className="rule flex-1" />
              <h2 className="section-head text-2xl">The League Table</h2>
              <hr className="rule flex-1" />
            </div>
            {/* Mobile: stacked cards, no horizontal scroll */}
            <div className="space-y-3 sm:hidden">
              {data.entrants.map((e) => (
                <div key={e.name} className="border-2 border-ink p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="display text-3xl leading-none text-ink-soft">
                        {e.rank}
                      </span>
                      <span className="font-display text-2xl uppercase tracking-wide">
                        {e.name}
                      </span>
                    </div>
                    <div className="text-right leading-none">
                      <div className="display text-3xl text-red">{e.goals}</div>
                      <div className="kicker mt-1">Goals</div>
                    </div>
                  </div>
                  <hr className="rule my-2.5" />
                  <div className="grid gap-y-1.5 text-[0.95rem]">
                    {e.teams.map((t) => (
                      <Selection key={t.code} team={t} />
                    ))}
                  </div>
                  <div className="mt-2.5 font-mono text-xs text-ink-soft">
                    {e.alive}/3 in
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full league table */}
            <div className="hidden overflow-x-auto border-2 border-ink sm:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="kicker border-b-2 border-ink bg-paper-3/50 [&>th]:px-3 [&>th]:py-2.5">
                    <th className="text-center">Pos</th>
                    <th>Punter</th>
                    <th>Selections</th>
                    <th className="text-right">Goals</th>
                    <th className="text-right">In</th>
                  </tr>
                </thead>
                <tbody className="font-serif">
                  {data.entrants.map((e) => (
                    <tr
                      key={e.name}
                      className="border-b border-ink/20 align-middle transition-colors last:border-0 hover:bg-paper-3/40 [&>td]:px-3 [&>td]:py-2.5"
                    >
                      <td className="display text-center text-2xl leading-none text-ink-soft">
                        {e.rank}
                      </td>
                      <td className="font-display text-xl uppercase tracking-wide whitespace-nowrap">
                        {e.name}
                      </td>
                      <td className="min-w-[18rem]">
                        <div className="grid gap-x-8 gap-y-1 text-[0.95rem] sm:grid-cols-3">
                          {e.teams.map((t) => (
                            <Selection key={t.code} team={t} />
                          ))}
                        </div>
                      </td>
                      <td className="display text-right text-2xl leading-none text-red">
                        {e.goals}
                      </td>
                      <td className="text-right font-mono text-sm text-ink-soft">
                        {e.alive}/3
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-serif text-sm italic text-ink-soft">
              &ldquo;Goals&rdquo; is each punter&apos;s combined tally across all
              three teams. &ldquo;In&rdquo; is teams still alive. Ranked by
              survival first, then goals.
            </p>
          </section>

          {/* ── Results & fixtures ───────────────────────────── */}
          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rise" style={{ animationDelay: "0.4s" }}>
              <h2 className="section-head mb-1 text-lg">Latest Results</h2>
              <hr className="rule mb-1" />
              <PaginatedFixtures
                matches={data.matches.recent}
                empty="Not a ball kicked yet."
              />
            </div>
            <div className="rise" style={{ animationDelay: "0.48s" }}>
              <h2 className="section-head mb-1 text-lg">Fixtures</h2>
              <hr className="rule mb-1" />
              <PaginatedFixtures
                matches={data.matches.upcoming}
                empty="No fixtures scheduled."
              />
            </div>
          </section>

          {/* ── Colophon ─────────────────────────────────────── */}
          <footer className="mt-12">
            <hr className="rule-double" />
            <p className="py-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.25em] text-ink-soft">
              Beefstake Press · Wire by football-data.org · Reset every 60s ·
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
            {data.unmatched.length > 0 && (
              <p className="pb-4 text-center font-mono text-[0.6rem] text-red">
                Unmatched: {data.unmatched.join(", ")}
              </p>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
