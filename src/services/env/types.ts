// Environment retrieval layer types. The LiveButton in TheaterWorkbench maps
// these to the WASM physics engine inputs (temperatureF / dustMgM3 / RH /
// salinity / UV W/m²).

export type DustLoad = "low" | "moderate" | "high" | "severe";

export interface OpenMeteoSnapshot {
  // °C
  tempC: number;
  // % 0..100
  relativeHumidity: number;
  // km/h
  windKmh: number;
  // meters
  visibilityMeters: number;
  // 0..11+
  uvIndex: number;
  // W/m² total downwelling shortwave (UV + visible + near-IR), peaks ~1000
  shortwaveRadiationWm2: number;
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
