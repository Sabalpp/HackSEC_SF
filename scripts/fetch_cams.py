"""
Pre-fetch CAMS dust/aerosol forecast for each LandForge theater.

Writes one JSON snapshot per theater into public/cache/cams-{theater}.json.
The frontend reads those files via fetchCamsCache() — CAMS itself can't be
called from the browser (no CORS, requires auth).

Run manually before a demo:
    pip install cdsapi xarray netCDF4 requests
    export CAMS_API_KEY=...        # or put it in .env.local as CAMS_API_KEY=...
    python scripts/fetch_cams.py

Cron it daily for fresher data.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / "public" / "cache"
ENV_FILE = REPO_ROOT / ".env.local"

CAMS_URL = "https://ads.atmosphere.copernicus.eu/api"
CAMS_DATASET = "cams-global-atmospheric-composition-forecasts"


@dataclass(frozen=True)
class Theater:
    id: str
    lat: float
    lng: float


# Keep coords aligned with src/data/theaters.js.
THEATERS: tuple[Theater, ...] = (
    Theater("arctic", 68.35, -133.72),
    Theater("hormuz", 26.0253, 56.3314),
    Theater("taiwan", 23.7, 121.0),
)


def load_env_key() -> str | None:
    if key := os.environ.get("CAMS_API_KEY"):
        return key
    if not ENV_FILE.exists():
        return None
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        if k.strip() == "CAMS_API_KEY":
            return v.strip().strip('"').strip("'")
    return None


def dust_load_from_aod(aod: float) -> str:
    if aod >= 1.0:
        return "severe"
    if aod >= 0.5:
        return "high"
    if aod >= 0.2:
        return "moderate"
    return "low"


def fetch_one(client, theater: Theater) -> dict:
    """Pull a tiny bounding box around the theater point, average over it."""
    import xarray as xr  # local import so the stub-only flow doesn't need it

    bbox_pad = 0.5  # degrees — small enough to be ~one grid cell
    area = [
        theater.lat + bbox_pad,
        theater.lng - bbox_pad,
        theater.lat - bbox_pad,
        theater.lng + bbox_pad,
    ]
    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        client.retrieve(
            CAMS_DATASET,
            {
                "variable": [
                    "dust_aerosol_optical_depth_550nm",
                    "particulate_matter_2.5um",
                    "particulate_matter_10um",
                ],
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "time": "00:00",
                "leadtime_hour": "0",
                "type": "forecast",
                "format": "netcdf",
                "area": area,
            },
            str(tmp_path),
        )
        ds = xr.open_dataset(tmp_path)
        try:
            aod = float(ds["duaod550"].mean().values)
            pm25 = float(ds["pm2p5"].mean().values) * 1e9  # kg/m³ → µg/m³
            pm10 = float(ds["pm10"].mean().values) * 1e9
        finally:
            ds.close()
    finally:
        tmp_path.unlink(missing_ok=True)

    now = datetime.now(timezone.utc).isoformat()
    return {
        "theater": theater.id,
        "lat": theater.lat,
        "lng": theater.lng,
        "aod550": round(aod, 4),
        "pm25": round(pm25, 2),
        "pm10": round(pm10, 2),
        "dustLoad": dust_load_from_aod(aod),
        "fetchedAt": now,
        "validFor": now,
    }


def main() -> int:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = load_env_key()
    if not key:
        print("CAMS_API_KEY missing — set it in .env.local or export it.", file=sys.stderr)
        return 1

    try:
        import cdsapi
    except ImportError:
        print("cdsapi not installed. Run: pip install cdsapi xarray netCDF4", file=sys.stderr)
        return 1

    client = cdsapi.Client(url=CAMS_URL, key=key, quiet=True)

    failures: list[str] = []
    for theater in THEATERS:
        out_path = CACHE_DIR / f"cams-{theater.id}.json"
        try:
            print(f"Fetching CAMS for {theater.id}...", flush=True)
            payload = fetch_one(client, theater)
            out_path.write_text(json.dumps(payload, indent=2) + "\n")
            print(f"  wrote {out_path.relative_to(REPO_ROOT)}")
        except Exception as e:  # noqa: BLE001
            failures.append(f"{theater.id}: {e}")
            print(f"  FAILED: {e}", file=sys.stderr)

    if failures:
        print(f"\n{len(failures)} theater(s) failed:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
