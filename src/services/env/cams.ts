import type { CamsSnapshot, DustLoad } from "./types";

// CAMS (Copernicus Atmosphere Monitoring Service) cannot be called directly
// from the browser — auth + CORS forbid it. We pre-fetch on the server side via
// scripts/fetch_cams.py and ship JSON snapshots into public/cache/. This module
// just reads those static cache files.
//
// Cache miss (custom drop points outside our three theaters) returns null.

export function dustLoadFromAod(aod550: number): DustLoad {
  if (aod550 >= 1.0) return "severe";
  if (aod550 >= 0.5) return "high";
  if (aod550 >= 0.2) return "moderate";
  return "low";
}

export async function fetchCamsCache(
  theaterId: string,
  signal?: AbortSignal,
): Promise<CamsSnapshot | null> {
  const url = `/cache/cams-${theaterId}.json`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<CamsSnapshot>;
    if (typeof json.aod550 !== "number") return null;
    return {
      aod550: json.aod550,
      pm25: json.pm25 ?? 0,
      pm10: json.pm10 ?? 0,
      dustLoad: json.dustLoad ?? dustLoadFromAod(json.aod550),
      fetchedAt: json.fetchedAt ?? "",
      validFor: json.validFor ?? "",
    };
  } catch {
    return null;
  }
}
