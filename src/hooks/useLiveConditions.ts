import { useCallback, useState } from "react";
import { getTheaterSnapshot, type TheaterEnvSnapshot } from "../services/env";
import type { LandForgeInput, Precipitation } from "../sim/types";

// Maps a real-world env snapshot onto the slider-driven LandForgeInput fields.
// Only fields that have a defensible weather mapping get touched — terrain,
// EW state, and mission load stay user-controlled because no public API
// supplies them.

const VISIBILITY_FULL_METERS = 24000;

function mapVisibility(meters: number): number {
  return Math.max(0, Math.min(100, Math.round((meters / VISIBILITY_FULL_METERS) * 100)));
}

function mapPrecipitation(snap: TheaterEnvSnapshot): Precipitation {
  // Dust dominates if CAMS reports significant aerosol loading.
  if (snap.cams && (snap.cams.dustLoad === "high" || snap.cams.dustLoad === "severe")) {
    return "dust";
  }
  // WMO weather codes — snow band first because it can co-occur with low temps.
  const code = snap.weather.weatherCode;
  if (code >= 71 && code <= 77) return "snow";
  if (code === 85 || code === 86) return "snow";
  if (snap.weather.tempC <= 0 && snap.weather.precipMm > 0) return "snow";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95 && code <= 99) return "rain";
  if (snap.weather.precipMm > 0.1) return "rain";
  return "none";
}

export interface ApplySnapshotArgs {
  setField: <K extends keyof LandForgeInput>(key: K, value: LandForgeInput[K]) => void;
}

export function applySnapshotToFields(
  snap: TheaterEnvSnapshot,
  { setField }: ApplySnapshotArgs,
): void {
  setField("airTemp", Math.round(snap.weather.tempC));
  setField("visibility", mapVisibility(snap.weather.visibilityMeters));
  setField("precipitation", mapPrecipitation(snap));
}

export interface UseLiveConditionsArgs {
  lat: number;
  lng: number;
  theaterId?: string;
  setField: ApplySnapshotArgs["setField"];
}

export interface UseLiveConditionsResult {
  loading: boolean;
  error: string | null;
  snapshot: TheaterEnvSnapshot | null;
  pull: () => Promise<void>;
}

export function useLiveConditions({
  lat,
  lng,
  theaterId,
  setField,
}: UseLiveConditionsArgs): UseLiveConditionsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TheaterEnvSnapshot | null>(null);

  const pull = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getTheaterSnapshot({ lat, lng, theaterId });
      applySnapshotToFields(snap, { setField });
      setSnapshot(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [lat, lng, theaterId, setField]);

  return { loading, error, snapshot, pull };
}
