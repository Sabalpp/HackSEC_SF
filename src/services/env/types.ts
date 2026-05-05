// Environment retrieval layer types. These are SEPARATE from src/sim/types.ts
// on purpose — the sim contract (LandForgeInput/Output) is teammate A's seam
// and we don't extend it from here. The env layer hands back a snapshot, then
// the useLiveConditions hook maps that snapshot onto the existing sim fields.

export type DustLoad = "low" | "moderate" | "high" | "severe";

export interface OpenMeteoSnapshot {
  // °C
  tempC: number;
  // % 0..100
  relativeHumidity: number;
  // km/h
  windKmh: number;
  // meters (Open-Meteo native unit, max ~24km)
  visibilityMeters: number;
  // 0..11+
  uvIndex: number;
  // WMO weather interpretation code
  weatherCode: number;
  // mm in last hour
  precipMm: number;
  // ISO timestamp the data is valid for
  validAt: string;
}

export interface CamsSnapshot {
  // Aerosol optical depth at 550nm (dimensionless)
  aod550: number;
  // µg/m³
  pm25: number;
  // µg/m³
  pm10: number;
  // Bucketed dust intensity for downstream UI
  dustLoad: DustLoad;
  // ISO timestamp the cache file was generated
  fetchedAt: string;
  // ISO timestamp the data inside is valid for
  validFor: string;
}

export interface TheaterEnvSnapshot {
  lat: number;
  lng: number;
  // null when CAMS cache is missing (e.g. custom drop points)
  cams: CamsSnapshot | null;
  weather: OpenMeteoSnapshot;
  // ISO timestamp this snapshot was assembled
  retrievedAt: string;
}
