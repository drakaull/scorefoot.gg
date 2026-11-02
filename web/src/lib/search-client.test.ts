import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResults } from "./api";
import { createSearch, type SearchState } from "./search-client";

const results = (name: string): SearchResults => ({
  players: [{ id: 1, name, photo: null, club: null, position: null, season: null }],
  clubs: [],
});

describe("createSearch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits 150 ms after the last key press and sends one request", async () => {
    const fetcher = vi.fn(async (q: string) => results(q));
    const states: SearchState[] = [];
    const search = createSearch(fetcher, (s) => states.push(s));

    search("mb");
    await vi.advanceTimersByTimeAsync(100);
    search("mba");
    await vi.advanceTimersByTimeAsync(100);
    search("mbap");
    await vi.advanceTimersByTimeAsync(150);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("mbap");
    expect(states.at(-1)).toEqual({ status: "done", query: "mbap", results: results("mbap") });
  });

  it("never lets an older answer replace a newer one", async () => {
    const pending: Record<string, (r: SearchResults) => void> = {};
    const fetcher = (q: string) => new Promise<SearchResults>((resolve) => (pending[q] = resolve));
    const states: SearchState[] = [];
    const search = createSearch(fetcher, (s) => states.push(s));

    search("erl");
    await vi.advanceTimersByTimeAsync(150);
    search("erling");
    await vi.advanceTimersByTimeAsync(150);
    pending["erling"]?.(results("erling"));
    await vi.advanceTimersByTimeAsync(0);
    pending["erl"]?.(results("erl")); // slow answer arrives last
    await vi.advanceTimersByTimeAsync(0);

    expect(states.filter((s) => s.status === "done").map((s) => s.status === "done" && s.query)).toEqual(["erling"]);
  });

  it("goes back to idle under 2 characters and reports errors", async () => {
    const states: SearchState[] = [];
    const search = createSearch(async () => Promise.reject(new Error("down")), (s) => states.push(s));

    search("m");
    expect(states.at(-1)).toEqual({ status: "idle" });
    search("mb");
    await vi.advanceTimersByTimeAsync(150);
    expect(states.at(-1)).toEqual({ status: "error", query: "mb" });
  });
});
