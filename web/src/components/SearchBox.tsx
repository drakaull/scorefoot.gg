"use client";

import { LoaderCircle, Search } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { type PlayerResult, type SearchResults, validQuery } from "@/lib/api";
import { compareHref, type ComparePick } from "@/lib/compare";
import { createSearch, fetchSearch, type SearchState } from "@/lib/search-client";
import { entityPath, initials } from "@/lib/slug";

type Href = string | ReturnType<typeof compareHref>;
type Item = { key: string; href: Href; name: string; sub: string; image: string | null; round: boolean };
type Shown = { query: string; results: SearchResults };

/** Comparator use: players only, a choice fills `slot` and keeps the other player. */
export type CompareTarget = { slot: 0 | 1; picks: [ComparePick, ComparePick] };

const playerHref = (p: PlayerResult, compare: CompareTarget | undefined): Href => {
  if (!compare) return entityPath("players", p.id, p.name);
  const picks: [ComparePick, ComparePick] = [...compare.picks];
  picks[compare.slot] = { id: p.id, name: p.name };
  return compareHref(picks);
};

/** The search bar: big on the home page; `compact` and `compare` for a comparator slot (players only, no Ctrl+K). */
export function SearchBox({ compact = false, compare }: { compact?: boolean; compare?: CompareTarget }) {
  const t = useTranslations("Search");
  const tPos = useTranslations("Position");
  const router = useRouter();
  // True from Enter (or click) until the result page is on screen: the spinner keeps showing meanwhile.
  const [navigating, startNavigation] = useTransition();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Last answer, kept on screen while the next one loads so the list does not flicker.
  const [shown, setShown] = useState<Shown | null>(null);
  // Enter pressed before the answer for the typed text arrived: open its first result when it does.
  const pendingEnter = useRef(false);
  // Created on the first key press (refs may only be used outside render).
  const searchRef = useRef<ReturnType<typeof createSearch>>(null);
  const search = (input: string) => {
    searchRef.current ??= createSearch(fetchSearch, (s) => {
      setState(s);
      if (s.status === "idle" || s.status === "error") setShown(null);
      if (s.status !== "done") return;
      setShown({ query: s.query, results: s.results });
      // Same order as the list: players first, then clubs.
      const [p] = s.results.players;
      const [c] = compare ? [] : s.results.clubs;
      const href = !pendingEnter.current ? null : p ? playerHref(p, compare) : c ? entityPath("clubs", c.id, c.name) : null;
      pendingEnter.current = false;
      if (href) {
        setOpen(false);
        startNavigation(() => router.push(href));
      }
    });
    searchRef.current(input);
  };

  // Ctrl+K / Cmd+K focuses the bar from anywhere on the page (the home bar only).
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);

  const position = (p: string | null) => (p && tPos.has(p) ? tPos(p) : p);
  const results = shown?.results ?? null;
  const players: Item[] = (results?.players ?? []).map((p) => ({
    key: `p${p.id}`,
    href: playerHref(p, compare),
    name: p.name,
    sub: [p.club, position(p.position)].filter(Boolean).join(" · "),
    image: p.photo,
    round: true,
  }));
  const clubs: Item[] = (compare ? [] : (results?.clubs ?? [])).map((c) => ({
    key: `c${c.id}`,
    href: entityPath("clubs", c.id, c.name),
    name: c.name,
    sub: [c.league, c.country].filter(Boolean).join(" · "),
    image: c.logo,
    round: false,
  }));
  const items = [...players, ...clubs];
  const showList = open && state.status !== "idle";
  const optionId = (i: number) => `${id}-option-${i}`;

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    startNavigation(() => router.push(item.href));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (items.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const query = validQuery(text);
      if (shown && shown.query === query) go(items[active]);
      else if (query) pendingEnter.current = true;
    } else if (e.key === "Escape") {
      pendingEnter.current = false;
      setOpen(false);
    }
  };

  const group = (label: string, list: Item[], offset: number) =>
    list.length > 0 && (
      <div role="group" aria-labelledby={`${id}-${label}`}>
        <div id={`${id}-${label}`} role="presentation" className="px-4 pt-3 pb-1 text-caption font-semibold tracking-[0.04em] text-muted uppercase">
          {label}
        </div>
        {list.map((item, i) => {
          const index = offset + i;
          return (
            <div
              key={item.key}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input
              onMouseEnter={() => setActive(index)}
              onClick={() => go(item)}
              className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 ${index === active ? "bg-raised" : ""}`}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className={`size-8 shrink-0 bg-raised object-contain ${item.round ? "rounded-full" : ""}`}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center border border-border bg-raised text-caption font-bold text-muted ${item.round ? "rounded-full" : "rounded-sm"}`}
                >
                  {initials(item.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-tight">{item.name}</span>
                {item.sub && <span className="block truncate text-caption text-muted">{item.sub}</span>}
              </span>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className={`relative text-left ${compact ? "" : "mx-auto mt-7 max-w-[680px]"}`}>
      <div
        className={`flex items-center gap-3 border border-border bg-raised text-muted focus-within:outline-2 focus-within:outline-accent ${
          compact ? "h-9 rounded-sm px-3" : "h-14 rounded-card px-4"
        }`}
      >
        {state.status === "loading" || navigating ? (
          <LoaderCircle aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0 animate-spin" />
        ) : (
          <Search aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t(compare ? "comparePlaceholder" : "label")}
          aria-expanded={showList}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={showList && items.length ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={t(compare ? "comparePlaceholder" : "placeholder")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
            pendingEnter.current = false;
            search(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            pendingEnter.current = false;
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
          className={`h-full min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-muted ${compact ? "" : "sm:text-h3"}`}
        />
        {!compact && (
          <kbd className="hidden shrink-0 rounded-sm border border-border px-2 py-0.5 font-sans text-caption font-semibold sm:block">
            {t("shortcut")}
          </kbd>
        )}
      </div>

      <div
        id={`${id}-listbox`}
        role="listbox"
        aria-label={t("label")}
        hidden={!showList}
        className="absolute inset-x-0 top-full z-10 mt-2 max-h-[70vh] overflow-y-auto rounded-card border border-border bg-surface pb-2"
      >
        {state.status === "error" && <p className="px-4 pt-3 text-error">{t("error")}</p>}
        {state.status === "loading" && items.length === 0 && <p className="px-4 pt-3 text-muted">{t("loading")}</p>}
        {state.status === "done" && items.length === 0 && (
          <p className="px-4 pt-3 text-muted">{t("empty", { query: state.query })}</p>
        )}
        {group(t("players"), players, 0)}
        {group(t("clubs"), clubs, players.length)}
      </div>
    </div>
  );
}
