import { validQuery, type SearchResults } from "./api";

export type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; results: SearchResults }
  | { status: "error"; query: string };

export type Fetcher = (query: string, signal: AbortSignal) => Promise<SearchResults>;

/**
 * Returns a function to call on every key press. It waits `delayMs` after the last call, cancels the
 * previous request, and drops any answer that is not for the latest query.
 */
export function createSearch(fetcher: Fetcher, onState: (state: SearchState) => void, delayMs = 150) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  return (input: string) => {
    clearTimeout(timer);
    controller?.abort();
    const query = validQuery(input);
    if (!query) return onState({ status: "idle" });

    timer = setTimeout(async () => {
      const current = (controller = new AbortController());
      onState({ status: "loading", query });
      try {
        const results = await fetcher(query, current.signal);
        if (!current.signal.aborted) onState({ status: "done", query, results });
      } catch {
        if (!current.signal.aborted) onState({ status: "error", query });
      }
    }, delayMs);
  };
}

export async function fetchSearch(query: string, signal: AbortSignal): Promise<SearchResults> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json();
}
