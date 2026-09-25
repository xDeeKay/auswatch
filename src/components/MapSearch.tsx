"use client";

import { useEffect, useRef, useState } from "react";
import { TextInput } from "@/components/ui/Field";
import { AUSTRALIA_BOUNDS } from "@/lib/map-constants";
import type { FlyTarget } from "@/components/MapFlyTo";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
};

type SearchResult = {
  label: string;
  target: FlyTarget;
};

const [[SOUTH, WEST], [NORTH, EAST]] = AUSTRALIA_BOUNDS;
const VIEWBOX = `${WEST},${NORTH},${EAST},${SOUTH}`;
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

function toResult(raw: NominatimResult): SearchResult {
  const lat = Number(raw.lat);
  const lng = Number(raw.lon);
  const [south, north, west, east] = raw.boundingbox.map(Number);
  return {
    label: raw.display_name,
    target: {
      lat,
      lng,
      bounds: [
        [south, west],
        [north, east],
      ],
    },
  };
}

export function MapSearch({ onSelect }: { onSelect: (target: FlyTarget) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          q: query,
          countrycodes: "au",
          viewbox: VIEWBOX,
          limit: "5",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Nominatim search returned ${response.status}`);
        const raw: NominatimResult[] = await response.json();
        setResults(raw.map(toResult));
        setOpen(true);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function selectResult(result: SearchResult) {
    abortRef.current?.abort();
    skipNextSearchRef.current = true;
    onSelect(result.target);
    setQuery(result.label);
    setOpen(false);
    setResults([]);
    setLoading(false);
  }

  return (
    <div className="auswatch-map-search">
      <TextInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) selectResult(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search a suburb, street or address"
        aria-label="Search the map"
        className="bg-surface/90 shadow"
      />

      {open && (loading || results.length > 0) && (
        <ul className="absolute left-0 right-0 top-full z-[950] mt-1 max-h-64 overflow-y-auto rounded border border-foreground/20 bg-surface/95 shadow">
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-foreground/50">Searching&hellip;</li>
          )}
          {results.map((result, i) => (
            <li key={`${result.target.lat}-${result.target.lng}-${i}`}>
              <button
                type="button"
                onClick={() => selectResult(result)}
                className="block w-full px-3 py-2 text-left text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
