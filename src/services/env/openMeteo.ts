import type { OpenMeteoSnapshot } from "./types";

// Open-Meteo is keyless and CORS-friendly — safe to call directly from the
// browser. We pull shortwave_radiation (W/m²) so we can drive the UV/irradiance
// slider with a real value rather than the UV index proxy.

const BASE = "https://api.open-meteo.com/v1/forecast";

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "visibility",
  "uv_index",
  "shortwave_radiation",
  "weather_code",
  "precipitation",
].join(",");

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    visibility?: number;
    uv_index?: number;
    shortwave_radiation?: number;
    weather_code?: number;
    precipitation?: number;
  };
}

export async function fetchOpenMeteo(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<OpenMeteoSnapshot> {
  const url = new URL(BASE);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("current", CURRENT_VARS);
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "UTC");

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as OpenMeteoResponse;
  const c = json.current;
  if (!c) {
    throw new Error("Open-Meteo response missing 'current' block");
  }

  return {
    tempC: c.temperature_2m ?? 0,
    relativeHumidity: c.relative_humidity_2m ?? 0,
    windKmh: c.wind_speed_10m ?? 0,
    visibilityMeters: c.visibility ?? 24000,
    uvIndex: c.uv_index ?? 0,
    shortwaveRadiationWm2: c.shortwave_radiation ?? 0,
    weatherCode: c.weather_code ?? 0,
    precipMm: c.precipitation ?? 0,
    validAt: c.time ?? new Date().toISOString(),
  };
}
