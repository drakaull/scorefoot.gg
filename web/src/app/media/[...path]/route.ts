import { apiUrl, isMediaPath } from "@/lib/api";

// Images come from our own domain: the browser never calls the api or a third-party CDN.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!isMediaPath(path)) return new Response(null, { status: 404 });

  try {
    const res = await fetch(`${apiUrl()}/media/${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok || !res.body) return new Response(null, { status: res.status === 404 ? 404 : 502 });
    return new Response(res.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": res.headers.get("Cache-Control") ?? "public, max-age=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
