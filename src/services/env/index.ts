import { fetchCamsCache } from "./cams";
import { fetchOpenMeteo } from "./openMeteo";
import type { TheaterEnvSnapshot } from "./types";

export type { TheaterEnvSnapshot, OpenMeteoSnapshot, CamsSnapshot, DustLoad } from "./types";

export interface GetSnapshotArgs {
  lat: number;
  lng: number;
  theaterId?: string;
  signal?: AbortSignal;
}

export async function getTheaterSnapshot({
  lat,
  lng,
  theaterId,
  signal,
}: GetSnapshotArgs): Promise<TheaterEnvSnapshot> {
  const [weather, cams] = await Promise.all([
    fetchOpenMeteo(lat, lng, signal),
    theaterId ? fetchCamsCache(theaterId, signal) : Promise.resolve(null),
  ]);
  return {
    lat,
    lng,
    cams,
    weather,
    retrievedAt: new Date().toISOString(),
  };
}
