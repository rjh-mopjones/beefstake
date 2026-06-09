import { NextResponse } from "next/server";
import { fetchWorldCupMatches } from "@/lib/football";
import { computeStandings } from "@/lib/standings";

// Recompute at most once a minute; the underlying fetch is cached too.
export const revalidate = 60;

export async function GET() {
  try {
    const matches = await fetchWorldCupMatches();
    const standings = computeStandings(matches);
    return NextResponse.json(standings, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
