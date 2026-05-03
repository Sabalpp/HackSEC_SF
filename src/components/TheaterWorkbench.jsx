import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import initPhysicsEngine, { Engine as PhysicsEngine } from "../../pkg/engine.js";
import { theaters } from "../data/theaters";
import { getTheaterSnapshot } from "../services/env";
import { TheaterEnvironment } from "./TheaterEnvironment";
import landforgeIcon from "../assets/landforge-icon.png";

const formatCoord = (n) => `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)}°`;

function buildCustomTheater(lat, lng) {
  return {
    id: "custom",
    label: `Custom · ${formatCoord(lat)}, ${formatCoord(lng)}`,
    shortLabel: "Custom",
    region: "Operator-defined drop point",
    lat,
    lng,
    intro: "Custom drop point — sim runs against generic terrain priors.",
    accent: "#66d8ff",
  };
}

const ENVIRONMENT_DEFAULTS_BY_THEATER = {
  arctic: {
    temperatureF: -22,
    dustMgM3: 0.5,
    relativeHumidityPct: 85,
    salinityPct: 0.5,
    uvWm2: 150,
    durationDays: "90",
    material: "MildSteelColdWeather",
  },
  hormuz: {
    temperatureF: 118,
    dustMgM3: 8,
    relativeHumidityPct: 20,
    salinityPct: 2,
    uvWm2: 900,
    durationDays: "90",
    material: "MildSteelTemperate",
  },
  taiwan: {
    temperatureF: 93,
    dustMgM3: 1,
    relativeHumidityPct: 85,
    salinityPct: 3.5,
    uvWm2: 600,
    durationDays: "90",
    material: "Aluminum5083",
  },
};

const buildEnvironmentDefaults = (theaterId) => ({
  ...(ENVIRONMENT_DEFAULTS_BY_THEATER[theaterId] ?? ENVIRONMENT_DEFAULTS_BY_THEATER.arctic),
});

const parseDurationDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
};

const LIVE_REFRESH_INTERVAL_MS = 60_000;
const REALTIME_SIM_DAYS_PER_REAL_SECOND = 0.25;
const ENGINE_SECONDS_PER_SIM_DAY = 0.1;

let physicsEngineInitPromise = null;

const VEHICLE_UNIT_OPTIONS = [
  { id: "ugv", label: "Land Unit" },
  { id: "drone", label: "Air Unit" },
];

const MATERIAL_OPTIONS = [
  "MildSteelTemperate",
  "MildSteelColdWeather",
  "HighStrengthAH36",
  "HighStrengthDH36",
  "HighStrengthEH36",
  "UltraHighStrengthEH40",
  "Aluminum5083",
  "Aluminum5086",
  "GRPFiberglass",
  "CFRPCarbonFiber",
  "TitaniumGrade5",
];

const MATERIAL_ENGINE_KEYS = {
  MildSteelTemperate: "MildSteelTemperate",
  MildSteelColdWeather: "MildSteelColdWeather",
  HighStrengthAH36: "AH36",
  HighStrengthDH36: "DH36",
  HighStrengthEH36: "EH36",
  UltraHighStrengthEH40: "EH40",
  Aluminum5083: "Al5083",
  Aluminum5086: "Al5086",
  GRPFiberglass: "GRP",
  CFRPCarbonFiber: "CFRP",
  TitaniumGrade5: "TiGrade5",
};

const VEHICLE_HEALTH_GROUPS = [
  {
    label: "Chassis",
    subsystem: "chassis",
    children: [
      "Frame",
      "Plating",
      "Suspension",
      "Underbelly",
      "Track / wheels",
      "Hatches & doors",
    ],
  },
  {
    label: "Sensors",
    subsystem: "sensors",
    children: [
      "Thermal",
      "Radar",
      "Acoustic",
      "GPS",
      "Camera",
    ],
  },
  { label: "Battery", subsystem: "battery" },
  { label: "Engine", subsystem: "engine" },
  { label: "Hydraulics", subsystem: "hydraulics" },
];

const DEFAULT_HEALTH_SNAPSHOT = Object.freeze({
  frame: 0,
  elapsed_s: 0,
  vehicle_health: 1,
  subsystems: Object.freeze({
    chassis: 1,
    sensors: 1,
    battery: 1,
    engine: 1,
    hydraulics: 1,
  }),
});

const ENVIRONMENT_FIELDS = [
  {
    id: "temperatureF",
    symbol: "T(t)",
    label: "Temperature",
    min: -40,
    max: 140,
    step: 1,
    minLabel: "Arctic -40°F",
    maxLabel: "Desert 140°F",
    accent: "#60a5fa",
    accentRgb: "96,165,250",
    format: (value) => `${value}°F`,
  },
  {
    id: "dustMgM3",
    symbol: "D(t)",
    label: "Dust concentration",
    min: 0,
    max: 10,
    step: 0.1,
    minLabel: "0 mg/m³",
    maxLabel: "High particulate",
    accent: "#f59e0b",
    accentRgb: "245,158,11",
    format: (value) => `${value.toFixed(1)} mg/m³`,
  },
  {
    id: "relativeHumidityPct",
    symbol: "Y(t)",
    label: "Relative humidity",
    min: 0,
    max: 100,
    step: 1,
    minLabel: "0%",
    maxLabel: "100%",
    accent: "#22c55e",
    accentRgb: "34,197,94",
    format: (value) => `${value}%`,
  },
  {
    id: "salinityPct",
    symbol: "σ(t)",
    label: "Salinity concentration",
    min: 0,
    max: 10,
    step: 0.1,
    minLabel: "0%",
    midLabel: "3.5% seawater",
    maxLabel: "10%",
    accent: "#38bdf8",
    accentRgb: "56,189,248",
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    id: "uvWm2",
    symbol: "U(t)",
    label: "UV irradiance",
    min: 0,
    max: 1000,
    step: 10,
    minLabel: "0 W/m²",
    maxLabel: "Peak solar 1000 W/m²",
    accent: "#eab308",
    accentRgb: "234,179,8",
    format: (value) => `${value} W/m²`,
  },
];

function EnvironmentSlider({ field, value, onChange }) {
  const progress = ((value - field.min) / (field.max - field.min)) * 100;

  return (
    <label
      className="env-field"
      style={{
        "--field-accent": field.accent,
        "--field-accent-rgb": field.accentRgb,
        "--field-progress": `${progress}%`,
      }}
    >
      <div className="env-field__top">
        <span className="env-field__identity">
          <span className="env-field__symbol">{field.symbol}</span>
          <span className="env-field__name">{field.label}</span>
        </span>
        <span className="env-field__value">{field.format(value)}</span>
      </div>
      <input
        className="env-field__range"
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="env-field__scale">
        <span>{field.minLabel}</span>
        {field.midLabel && <span>{field.midLabel}</span>}
        <span>{field.maxLabel}</span>
      </div>
    </label>
  );
}

const clampHealthUnit = (value) => {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
};

const formatHealthPercent = (value) => `${Math.round(clampHealthUnit(value) * 100)}%`;

const parsePhysicsSnapshot = (snapshotJson) => {
  try {
    const parsed = JSON.parse(snapshotJson);
    if (parsed && parsed.subsystems) return parsed;
  } catch (error) {
    console.error("Unable to parse physics engine snapshot", error);
  }
  return DEFAULT_HEALTH_SNAPSHOT;
};

const ensurePhysicsEngineRuntime = () => {
  if (!physicsEngineInitPromise) {
    physicsEngineInitPromise = initPhysicsEngine();
  }
  return physicsEngineInitPromise;
};

const fahrenheitToCelsius = (temperatureF) => (temperatureF - 32) * (5 / 9);

const buildPhysicsEnvironment = (params) => {
  return {
    temperatureC: fahrenheitToCelsius(Number(params.temperatureF) || 0),
    particulateConcentration: (Number(params.dustMgM3) || 0) / 1000,
    relativeHumidity: (Number(params.relativeHumidityPct) || 0) / 100,
    salinityConcentration: (Number(params.salinityPct) || 0) / 100,
    irradiance: (Number(params.uvWm2) || 0) / 1000,
  };
};

const mapLiveSnapshotToEnvironmentParams = (snapshot, currentParams) => ({
  ...currentParams,
  temperatureF: Math.round(snapshot.weather.tempC * (9 / 5) + 32),
  // AOD-based dust mapping: aod550=1.0 ~= 8 mg/m3 severe storm baseline.
  dustMgM3: snapshot.cams
    ? Math.min(10, Math.round(snapshot.cams.aod550 * 80) / 10)
    : currentParams.dustMgM3,
  relativeHumidityPct: Math.round(snapshot.weather.relativeHumidity),
  uvWm2: Math.round(snapshot.weather.shortwaveRadiationWm2 / 10) * 10,
});

const formatSimDay = (elapsedDays) => {
  if (!Number.isFinite(elapsedDays)) return "Day 1";
  return `Day ${Math.floor(elapsedDays) + 1}`;
};

function VehicleHealthPanel({ snapshot, runtimeState, simElapsedDays, liveStatus }) {
  const subsystems = snapshot?.subsystems ?? DEFAULT_HEALTH_SNAPSHOT.subsystems;
  const runtimeLabel =
    runtimeState === "running" ? "Ticking" : runtimeState === "paused" ? "Paused" : "Idle";
  const lastRefresh = liveStatus?.snapshot?.retrievedAt
    ? new Date(liveStatus.snapshot.retrievedAt)
    : null;
  const lastRefreshLabel =
    lastRefresh && !Number.isNaN(lastRefresh.valueOf())
      ? lastRefresh.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "Baseline";

  const renderHealthRow = (label, subsystem, className = "health-row") => {
    const health = clampHealthUnit(subsystems[subsystem] ?? snapshot?.vehicle_health ?? 1);
    const healthPercent = health * 100;
    const tone = health < 0.45 ? "critical" : health < 0.7 ? "watch" : "stable";

    return (
      <div className={className} data-tone={tone} key={label}>
        <div className="health-row__top">
          <span>{label}</span>
          <strong>{formatHealthPercent(health)}</strong>
        </div>
        <div className="health-row__meter" aria-hidden="true">
          <span style={{ "--health": `${healthPercent}%` }} />
        </div>
      </div>
    );
  };

  const overallHealth = clampHealthUnit(snapshot?.vehicle_health ?? 1);

  return (
    <aside className="health-panel" aria-label="Vehicle health">
      <div className="health-panel__overall">
        <div className="health-panel__overall-top">
          <span>Overall Vehicle Health</span>
          <strong>{formatHealthPercent(overallHealth)}</strong>
        </div>
        <div className="health-panel__meta">
          <span className="health-panel__status" data-state={runtimeState}>
            {runtimeLabel}
          </span>
          <span>{formatSimDay(simElapsedDays)}</span>
          <span>Env {lastRefreshLabel}</span>
        </div>
        <div className="health-panel__overall-meter" aria-hidden="true">
          <span style={{ "--health": `${overallHealth * 100}%` }} />
        </div>
      </div>

      <div className="health-panel__list">
        {VEHICLE_HEALTH_GROUPS.map((group) => (
          <div className="health-group" key={group.label}>
            {renderHealthRow(group.label, group.subsystem, "health-row health-row--parent")}
            {group.children && (
              <div className="health-group__children">
                {group.children.map((system) =>
                  renderHealthRow(system, group.subsystem, "health-row health-row--child"),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export function TheaterWorkbench() {
  const { theaterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const theater = useMemo(() => {
    if (theaterId === "custom") {
      const lat = Number.parseFloat(searchParams.get("lat") ?? "");
      const lng = Number.parseFloat(searchParams.get("lng") ?? "");
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return buildCustomTheater(lat, lng);
      }
    }
    return theaters[theaterId] ?? null;
  }, [theaterId, searchParams]);

  const [vehicleId, setVehicleId] = useState("ugv");
  const [runToken, setRunToken] = useState(0);
  const [runtimeState, setRuntimeState] = useState("idle");
  const [currentDay, setCurrentDay] = useState(1);
  const [simElapsedDays, setSimElapsedDays] = useState(0);
  const [vehicleHealthSnapshot, setVehicleHealthSnapshot] = useState(DEFAULT_HEALTH_SNAPSHOT);
  const physicsEngineRef = useRef(null);
  const simElapsedDaysRef = useRef(0);
  const activeMaterialKeyRef = useRef(null);
  const theaterIdForSim = theater && theater.id !== "custom" ? theater.id : "arctic";
  const [environmentParams, setEnvironmentParams] = useState(() =>
    buildEnvironmentDefaults(theaterIdForSim),
  );
  const environmentParamsRef = useRef(environmentParams);
  const [liveStatus, setLiveStatus] = useState({ stage: "idle", error: null, snapshot: null });
  const isRealtimeActive = runtimeState === "running";
  const isRealtimePaused = runtimeState === "paused";
  const simulationDurationDays = parseDurationDays(environmentParams.durationDays);
  const timelineProgress = Math.min(100, (simElapsedDays / simulationDurationDays) * 100);

  useEffect(() => {
    const defaults = buildEnvironmentDefaults(theaterIdForSim);
    environmentParamsRef.current = defaults;
    simElapsedDaysRef.current = 0;
    activeMaterialKeyRef.current = null;
    setEnvironmentParams(defaults);
    setRuntimeState("idle");
    setCurrentDay(1);
    setSimElapsedDays(0);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setLiveStatus({ stage: "idle", error: null, snapshot: null });
  }, [theaterIdForSim]);

  useEffect(() => {
    environmentParamsRef.current = environmentParams;
  }, [environmentParams]);

  useEffect(() => {
    let disposed = false;

    ensurePhysicsEngineRuntime()
      .then(() => {
        if (disposed) return;
        const engine = physicsEngineRef.current ?? new PhysicsEngine();
        physicsEngineRef.current = engine;
        setVehicleHealthSnapshot(parsePhysicsSnapshot(engine.get_vehicle()));
      })
      .catch((error) => {
        console.error("Unable to initialize physics engine", error);
      });

    return () => {
      disposed = true;
      physicsEngineRef.current?.free?.();
      physicsEngineRef.current = null;
    };
  }, []);

  const applyEnvironmentParams = (nextParams) => {
    environmentParamsRef.current = nextParams;
    setEnvironmentParams(nextParams);
  };

  const getMaterialKey = (params) => MATERIAL_ENGINE_KEYS[params.material] ?? params.material;

  const ensurePhysicsEngine = async () => {
    await ensurePhysicsEngineRuntime();
    const engine = physicsEngineRef.current ?? new PhysicsEngine();
    physicsEngineRef.current = engine;
    return engine;
  };

  const configurePhysicsEngine = async (params, { resetHealth = false } = {}) => {
    const engine = await ensurePhysicsEngine();
    const materialKey = getMaterialKey(params);
    if (activeMaterialKeyRef.current !== materialKey) {
      if (engine.set_material(materialKey)) {
        activeMaterialKeyRef.current = materialKey;
      } else {
        activeMaterialKeyRef.current = null;
        engine.reset();
      }
    } else if (resetHealth) {
      engine.reset();
    }
    return engine;
  };

  const resetVehicleHealth = async (params = environmentParamsRef.current) => {
    simElapsedDaysRef.current = 0;
    setSimElapsedDays(0);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);

    try {
      const engine = await configurePhysicsEngine(params, { resetHealth: true });
      const snapshot = parsePhysicsSnapshot(engine.get_vehicle());
      setVehicleHealthSnapshot(snapshot);
    } catch (error) {
      console.error("Unable to reset physics engine health", error);
    }
  };

  const startRealtime = async ({ resetHealth = false } = {}) => {
    const durationDays = parseDurationDays(environmentParamsRef.current.durationDays);
    const normalizedParams = {
      ...environmentParamsRef.current,
      durationDays: String(durationDays),
    };
    applyEnvironmentParams(normalizedParams);

    try {
      await configurePhysicsEngine(normalizedParams, { resetHealth });
      setRuntimeState("running");
      setRunToken((token) => token + 1);
    } catch (error) {
      console.error("Unable to start realtime physics engine", error);
    }
  };

  const pauseRealtime = () => {
    setRuntimeState("paused");
  };

  const resumeRealtime = async () => {
    await startRealtime({ resetHealth: false });
  };

  const fetchAndApplyLiveSnapshot = async ({ stage = "loading", signal } = {}) => {
    if (!theater) return null;
    setLiveStatus((current) => ({
      stage,
      error: null,
      snapshot: stage === "refreshing" ? current.snapshot : null,
    }));

    try {
      const snap = await getTheaterSnapshot({
        lat: theater.lat,
        lng: theater.lng,
        theaterId: theater.id !== "custom" ? theater.id : undefined,
        signal,
      });
      const nextParams = mapLiveSnapshotToEnvironmentParams(
        snap,
        environmentParamsRef.current,
      );
      applyEnvironmentParams(nextParams);
      setLiveStatus({ stage: "done", error: null, snapshot: snap });
      return nextParams;
    } catch (error) {
      if (error?.name === "AbortError") return null;
      setLiveStatus((current) => ({
        stage: "idle",
        error: error instanceof Error ? error.message : String(error),
        snapshot: current.snapshot,
      }));
      return null;
    }
  };

  useEffect(() => {
    if (!isRealtimeActive) return undefined;

    let raf = 0;
    let lastNow = performance.now();

    const tick = (now) => {
      const elapsedRealSeconds = Math.min(0.25, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      const physicsEngine = physicsEngineRef.current;
      const simDayStep = elapsedRealSeconds * REALTIME_SIM_DAYS_PER_REAL_SECOND;
      if (physicsEngine && simDayStep > 0) {
        const physicsEnvironment = buildPhysicsEnvironment(environmentParamsRef.current);
        try {
          physicsEngine.set_time_step(simDayStep * ENGINE_SECONDS_PER_SIM_DAY);
          const snapshot = parsePhysicsSnapshot(
            physicsEngine.tick(
              physicsEnvironment.temperatureC,
              physicsEnvironment.particulateConcentration,
              physicsEnvironment.relativeHumidity,
              physicsEnvironment.salinityConcentration,
              physicsEnvironment.irradiance,
            ),
          );
          const elapsedDays =
            Number.isFinite(snapshot.elapsed_s)
              ? snapshot.elapsed_s / ENGINE_SECONDS_PER_SIM_DAY
              : simElapsedDaysRef.current + simDayStep;
          simElapsedDaysRef.current = elapsedDays;
          setVehicleHealthSnapshot(snapshot);
          setSimElapsedDays(elapsedDays);
          setCurrentDay(Math.max(1, Math.floor(elapsedDays) + 1));
        } catch (error) {
          console.error("Unable to tick physics engine", error);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isRealtimeActive]);

  useEffect(() => {
    if (!isRealtimeActive || !theater) return undefined;

    let disposed = false;
    let controller = null;
    const refreshLiveEnvironment = async () => {
      controller?.abort();
      controller = new AbortController();
      const nextParams = await fetchAndApplyLiveSnapshot({
        stage: "refreshing",
        signal: controller.signal,
      });
      if (disposed || !nextParams) return;
    };

    const interval = window.setInterval(refreshLiveEnvironment, LIVE_REFRESH_INTERVAL_MS);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [isRealtimeActive, theater]);

  const setEnvironmentField = (fieldId, value) => {
    const nextParams = { ...environmentParamsRef.current, [fieldId]: value };
    applyEnvironmentParams(nextParams);
    if (fieldId === "material") {
      void resetVehicleHealth(nextParams);
    }
  };

  const resetEnvironment = () => {
    const defaults = buildEnvironmentDefaults(theaterIdForSim);
    applyEnvironmentParams(defaults);
    setRuntimeState("idle");
    setLiveStatus({ stage: "idle", error: null, snapshot: null });
    void resetVehicleHealth(defaults);
  };

  const runLive = async () => {
    const nextParams = await fetchAndApplyLiveSnapshot({ stage: "loading" });
    if (!nextParams) return;
    await startRealtime({
      resetHealth: runtimeState === "idle" && (vehicleHealthSnapshot.frame ?? 0) === 0,
    });
  };

  const setDurationDays = (value) => {
    setEnvironmentField("durationDays", value.replace(/\D/g, ""));
  };

  const normalizeDurationDays = () => {
    const normalizedParams = {
      ...environmentParamsRef.current,
      durationDays: String(parseDurationDays(environmentParamsRef.current.durationDays)),
    };
    applyEnvironmentParams(normalizedParams);
  };

  const adjustDurationDays = (delta) => {
    const currentDays = parseDurationDays(environmentParamsRef.current.durationDays);
    applyEnvironmentParams({
      ...environmentParamsRef.current,
      durationDays: String(Math.max(1, currentDays + delta)),
    });
  };

  const selectVehicleUnit = (nextVehicleId) => {
    setVehicleId(nextVehicleId);
    setRuntimeState("idle");
    void resetVehicleHealth(environmentParamsRef.current);
  };

  if (!theater) {
    return (
      <div className="wb-full">
        <div className="wb-environment">
          <div className="wb-environment__placeholder">
            <strong>Unknown location</strong>
            That theater id isn't recognized.
          </div>
        </div>
        <header className="wb-overlay-top">
          <button
            type="button"
            className="brand brand--button"
            onClick={() => navigate("/")}
            title="Back to globe"
          >
            <img src={landforgeIcon} alt="LandForge" className="brand__mark" />
            <div className="brand__text">
              <div className="brand__eyebrow">Land Autonomy Systems</div>
              <div className="brand__name">LANDFORGE</div>
            </div>
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="wb-full">
      <div className="wb-environment">
        <TheaterEnvironment
          theaterId={theaterIdForSim}
          vehicleId={vehicleId}
          runToken={runToken}
          simulationActive={isRealtimeActive}
        />
      </div>

      <header className="wb-overlay-top">
        <button
          type="button"
          className="brand brand--button"
          onClick={() => navigate("/")}
          title="Back to globe"
        >
          <img src={landforgeIcon} alt="LandForge" className="brand__mark" />
          <div className="brand__text">
            <div className="brand__eyebrow">{theater.region}</div>
            <div className="brand__name">{theater.label}</div>
          </div>
        </button>
      </header>

      <div className="run-sim-dock">
        <button
          type="button"
          className="run-sim-button"
          onClick={
            isRealtimeActive
              ? pauseRealtime
              : isRealtimePaused
                ? resumeRealtime
                : () => startRealtime({ resetHealth: (vehicleHealthSnapshot.frame ?? 0) === 0 })
          }
        >
          <span>
            {isRealtimeActive ? "Pause" : isRealtimePaused ? "Resume" : "Start Real-time"}
          </span>
        </button>
        <button
          type="button"
          className="run-sim-button run-sim-button--secondary"
          onClick={() => resetVehicleHealth()}
        >
          <span>Reset Health</span>
        </button>
      </div>

      <aside className="env-panel" aria-label="Simulation inputs">
          <div className="env-panel__head">
            <div className="env-panel__title-stack">
              <div className="env-panel__title">Simulation Inputs</div>
              {liveStatus.snapshot && (
                <div
                  className="env-panel__subtitle"
                  style={{ fontSize: "0.72rem", opacity: 0.7, marginTop: 2 }}
                >
                  Live · {liveStatus.snapshot.weather.tempC.toFixed(1)}°C · RH{" "}
                  {Math.round(liveStatus.snapshot.weather.relativeHumidity)}%
                  {liveStatus.snapshot.cams
                    ? ` · dust ${liveStatus.snapshot.cams.dustLoad}`
                    : ""}
                </div>
              )}
              {liveStatus.error && (
                <div
                  className="env-panel__subtitle"
                  style={{ fontSize: "0.72rem", color: "#ff8080", marginTop: 2 }}
                >
                  {liveStatus.error}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="env-panel__reset"
                onClick={resetEnvironment}
                data-active={liveStatus.stage !== "done"}
              >
                Default
              </button>
              <button
                type="button"
                className="env-panel__reset"
                onClick={runLive}
                disabled={liveStatus.stage === "loading" || liveStatus.stage === "refreshing"}
                data-active={liveStatus.stage === "done"}
              >
                {liveStatus.stage === "loading"
                  ? "Loading..."
                  : liveStatus.stage === "refreshing"
                    ? "Refreshing"
                    : isRealtimeActive && liveStatus.stage === "done"
                      ? "Live On"
                      : "Live"}
              </button>
            </div>
          </div>
          <div className="env-panel__body">
            <div className="unit-input">
              <span className="unit-input__label">Unit</span>
              <div className="unit-input__control" role="group" aria-label="Unit">
                {VEHICLE_UNIT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="unit-input__button"
                    data-active={vehicleId === option.id}
                    aria-pressed={vehicleId === option.id}
                    onClick={() => selectVehicleUnit(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="material-input">
              <span className="material-input__label">Material</span>
              <select
                className="material-input__select"
                value={environmentParams.material}
                onChange={(event) => setEnvironmentField("material", event.target.value)}
              >
                {MATERIAL_OPTIONS.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </label>

            {ENVIRONMENT_FIELDS.map((field) => (
              <EnvironmentSlider
                key={field.id}
                field={field}
                value={environmentParams[field.id]}
                onChange={(value) => setEnvironmentField(field.id, value)}
              />
            ))}

            <label className="env-duration">
              <div className="env-duration__top">
                <span>Simulation duration</span>
                <span>Default 90</span>
              </div>
              <div className="env-duration__control">
                <button
                  type="button"
                  className="env-duration__step"
                  onClick={() => adjustDurationDays(-1)}
                  aria-label="Decrease simulation duration"
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={environmentParams.durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  onBlur={normalizeDurationDays}
                />
                <button
                  type="button"
                  className="env-duration__step"
                  onClick={() => adjustDurationDays(1)}
                  aria-label="Increase simulation duration"
                >
                  +
                </button>
                <span>days</span>
              </div>
            </label>
          </div>
        </aside>

      <VehicleHealthPanel
        snapshot={vehicleHealthSnapshot}
        runtimeState={runtimeState}
        simElapsedDays={simElapsedDays}
        liveStatus={liveStatus}
      />

      {(runtimeState !== "idle" || simElapsedDays > 0) && (
        <div
          className="timeline-dock"
          style={{ "--timeline-progress": `${timelineProgress}%` }}
          aria-label="Simulation timeline"
        >
          <div
            className="timeline-dock__progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax={simulationDurationDays}
            aria-valuenow={Math.min(currentDay, simulationDurationDays)}
          >
            <div className="timeline-dock__fill" />
          </div>
          <div className="timeline-dock__scale">
            <span>{formatSimDay(simElapsedDays)}</span>
            <span>{simulationDurationDays} day reference</span>
          </div>
        </div>
      )}
    </div>
  );
}
