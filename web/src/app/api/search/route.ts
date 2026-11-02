import { apiUrl, validQuery } from "@/lib/api";

export async function GET(request: Request) {
  const q = validQuery(new URL(request.url).searchParams.get("q"));
  if (!q) return Response.json({ error: "q must be 2 to 50 characters long" }, { status: 400 });

  try {
    const res = await fetch(`${apiUrl()}/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ error: "search failed" }, { status: 502 });
    return Response.json(await res.json(), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "search unavailable" }, { status: 502 });
  }
}
