import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import initPhysicsEngine, { Engine as PhysicsEngine } from "../../pkg/engine.js";
import { theaters } from "../data/theaters";
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

const SIMULATION_RUN_DURATION_MS = 15000;
const PHYSICS_DEGRADATION_SCALE = 0.1;

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

function VehicleHealthPanel({ snapshot }) {
  const subsystems = snapshot?.subsystems ?? DEFAULT_HEALTH_SNAPSHOT.subsystems;
  const renderHealthRow = (label, subsystem, className = "health-row") => {
    const health = clampHealthUnit(subsystems[subsystem] ?? snapshot?.vehicle_health ?? 1);
    const healthPercent = health * 100;

    return (
      <div className={className} key={label}>
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
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [vehicleHealthSnapshot, setVehicleHealthSnapshot] = useState(DEFAULT_HEALTH_SNAPSHOT);
  const physicsEngineRef = useRef(null);
  const simulationInputsRef = useRef(null);
  const theaterIdForSim = theater && theater.id !== "custom" ? theater.id : "arctic";
  const [environmentParams, setEnvironmentParams] = useState(() =>
    buildEnvironmentDefaults(theaterIdForSim),
  );

  useEffect(() => {
    setEnvironmentParams(buildEnvironmentDefaults(theaterIdForSim));
    setIsSimulationActive(false);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
  }, [theaterIdForSim]);

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

  const simulationDurationDays = parseDurationDays(environmentParams.durationDays);

  useEffect(() => {
    if (!isSimulationActive) return undefined;

    const startedAt = performance.now();
    let lastSimulatedDay = 0;
    let raf = 0;
    const physicsEnvironment = buildPhysicsEnvironment(
      simulationInputsRef.current ?? environmentParams,
    );

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / SIMULATION_RUN_DURATION_MS);
      const simulatedDay = simulationDurationDays * progress;
      const dayStep = Math.max(0, simulatedDay - lastSimulatedDay);
      lastSimulatedDay = simulatedDay;

      setCurrentDay(Math.max(1, Math.round(1 + (simulationDurationDays - 1) * progress)));

      const physicsEngine = physicsEngineRef.current;
      if (physicsEngine && dayStep > 0) {
        try {
          physicsEngine.set_time_step(dayStep * PHYSICS_DEGRADATION_SCALE);
          setVehicleHealthSnapshot(parsePhysicsSnapshot(
            physicsEngine.tick(
              physicsEnvironment.temperatureC,
              physicsEnvironment.particulateConcentration,
              physicsEnvironment.relativeHumidity,
              physicsEnvironment.salinityConcentration,
              physicsEnvironment.irradiance,
            ),
          ));
        } catch (error) {
          console.error("Unable to tick physics engine", error);
        }
      }

      if (progress >= 1) {
        setIsSimulationActive(false);
        return;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isSimulationActive, simulationDurationDays]);

  const setEnvironmentField = (fieldId, value) => {
    setEnvironmentParams((current) => ({ ...current, [fieldId]: value }));
  };
  const resetEnvironment = () => {
    setEnvironmentParams(buildEnvironmentDefaults(theaterIdForSim));
  };
  const setDurationDays = (value) => {
    setEnvironmentField("durationDays", value.replace(/\D/g, ""));
  };
  const normalizeDurationDays = () => {
    setEnvironmentParams((current) => {
      return { ...current, durationDays: String(parseDurationDays(current.durationDays)) };
    });
  };
  const adjustDurationDays = (delta) => {
    setEnvironmentParams((current) => {
      const currentDays = parseDurationDays(current.durationDays);
      return { ...current, durationDays: String(Math.max(1, currentDays + delta)) };
    });
  };
  const runSimulation = async () => {
    const durationDays = parseDurationDays(environmentParams.durationDays);
    const normalizedParams = { ...environmentParams, durationDays: String(durationDays) };
    simulationInputsRef.current = normalizedParams;

    setEnvironmentParams(normalizedParams);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);

    try {
      await ensurePhysicsEngineRuntime();
      const physicsEngine = physicsEngineRef.current ?? new PhysicsEngine();
      physicsEngineRef.current = physicsEngine;
      const materialKey =
        MATERIAL_ENGINE_KEYS[normalizedParams.material] ?? normalizedParams.material;
      if (!physicsEngine.set_material(materialKey)) {
        physicsEngine.reset();
      }
      setVehicleHealthSnapshot(parsePhysicsSnapshot(physicsEngine.get_vehicle()));
    } catch (error) {
      console.error("Unable to start physics engine run", error);
    }

    setIsSimulationActive(true);
    setRunToken((token) => token + 1);
  };
  const selectVehicleUnit = (nextVehicleId) => {
    setVehicleId(nextVehicleId);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setIsSimulationActive(false);
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
          simulationActive={isSimulationActive}
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

      {!isSimulationActive && (
        <div className="run-sim-dock">
          <button
            type="button"
            className="run-sim-button"
            onClick={runSimulation}
          >
            <span>Run Simulation</span>
          </button>
        </div>
      )}

      {!isSimulationActive && (
        <aside className="env-panel" aria-label="Simulation inputs">
          <div className="env-panel__head">
            <div className="env-panel__title-stack">
              <div className="env-panel__title">Simulation Inputs</div>
            </div>
            <button type="button" className="env-panel__reset" onClick={resetEnvironment}>
              Default
            </button>
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
      )}

      {isSimulationActive && <VehicleHealthPanel snapshot={vehicleHealthSnapshot} />}

      {isSimulationActive && (
        <div
          className="timeline-dock"
          style={{ "--timeline-duration": `${SIMULATION_RUN_DURATION_MS}ms` }}
          aria-label="Simulation timeline"
        >
          <div
            className="timeline-dock__progress"
            role="progressbar"
            aria-valuemin="1"
            aria-valuemax={simulationDurationDays}
            aria-valuenow={currentDay}
          >
            <div className="timeline-dock__fill" />
          </div>
          <div className="timeline-dock__scale">
            <span>Day 1</span>
            <span>Day {simulationDurationDays}</span>
          </div>
        </div>
      )}
    </div>
  );
}
