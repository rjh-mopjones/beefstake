import { NextResponse } from "next/server";
import { fetchWorldCupMatches } from "@/lib/football";
import { computeStandings } from "@/lib/standings";

// Recompute on every request so each visit reflects the latest goals. Unlike
// `force-dynamic`, `revalidate = 0` leaves fetches with an explicit positive
// `revalidate` as-is, so the football-data fetch stays cached for 60s (see
// football.ts) — keeping us inside the free-tier rate limit while never
// serving a stale response from the route itself.
export const revalidate = 0;

export async function GET() {
  try {
    const matches = await fetchWorldCupMatches();
    const standings = computeStandings(matches);
    return NextResponse.json(standings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
