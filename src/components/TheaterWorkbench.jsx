import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    dayStepDaysPerSecond: "6",
    material: "MildSteelColdWeather",
  },
  hormuz: {
    temperatureF: 118,
    dustMgM3: 8,
    relativeHumidityPct: 20,
    salinityPct: 2,
    uvWm2: 900,
    durationDays: "90",
    dayStepDaysPerSecond: "6",
    material: "MildSteelTemperate",
  },
  taiwan: {
    temperatureF: 93,
    dustMgM3: 1,
    relativeHumidityPct: 85,
    salinityPct: 3.5,
    uvWm2: 600,
    durationDays: "90",
    dayStepDaysPerSecond: "6",
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

const TARGET_SIMULATION_RUN_DURATION_SECONDS = 15;
const DEFAULT_DAY_STEP_DAYS_PER_SECOND = 6;
const MIN_DAY_STEP_DAYS_PER_SECOND = 0.1;
const PHYSICS_DEGRADATION_SCALE = 0.1;
const BROKEN_HEALTH_THRESHOLD = 0.001;
const REPORT_MAX_POINTS = 120;
const REPORT_CHART_WIDTH = 180;
const REPORT_CHART_HEIGHT = 48;
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const CALENDAR_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

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

const DEFAULT_DIAGNOSTICS = Object.freeze({
  subsystems: Object.freeze({
    chassis: Object.freeze({ dx_dt: 0, factors: Object.freeze([]) }),
    sensors: Object.freeze({ dx_dt: 0, factors: Object.freeze([]) }),
    battery: Object.freeze({ dx_dt: 0, factors: Object.freeze([]) }),
    engine: Object.freeze({ dx_dt: 0, factors: Object.freeze([]) }),
    hydraulics: Object.freeze({ dx_dt: 0, factors: Object.freeze([]) }),
  }),
});

const toHealthItemId = (label) => (
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
);

const sanitizePositiveDecimalInput = (value) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  return decimalParts.length > 0 ? `${whole}.${decimalParts.join("")}` : whole;
};

const parseDayStepDaysPerSecond = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed)
    ? Math.max(MIN_DAY_STEP_DAYS_PER_SECOND, parsed)
    : DEFAULT_DAY_STEP_DAYS_PER_SECOND;
};

const formatDayStepDaysPerSecond = (value) => (
  String(Math.max(1, Math.round(value)))
);

const dayStepForTargetRunDuration = (durationDays) => (
  formatDayStepDaysPerSecond(durationDays / TARGET_SIMULATION_RUN_DURATION_SECONDS)
);

const estimatedRunDurationMs = (durationDays, dayStepDaysPerSecond) => (
  (durationDays / Math.max(MIN_DAY_STEP_DAYS_PER_SECOND, dayStepDaysPerSecond)) * 1000
);

const formatEstimatedRunDuration = (durationMs) => {
  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    const rounded = totalSeconds < 10 ? totalSeconds.toFixed(1) : totalSeconds.toFixed(0);
    return `${rounded} sec`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

const startOfCalendarDay = (date) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
);

const calendarDateKey = (date) => Date.UTC(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
);

const addCalendarDays = (date, dayCount) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayCount)
);

const daysBetweenCalendarDates = (startDate, endDate) => (
  Math.round((calendarDateKey(endDate) - calendarDateKey(startDate)) / DAY_MS)
);

const buildCalendarMonth = (viewDate, startDate, durationDays) => {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - firstWeekday + index);
    const dayOffset = daysBetweenCalendarDates(startDate, date);
    return {
      key: calendarDateKey(date),
      date,
      inMonth: date.getMonth() === viewDate.getMonth(),
      inSimulationRange: dayOffset >= 0 && dayOffset <= durationDays,
    };
  });
};

const REPORT_HEALTH_ITEMS = [
  { id: "overall", label: "Overall Vehicle Health", overall: true },
  ...VEHICLE_HEALTH_GROUPS.flatMap((group) => [
    {
      id: group.subsystem,
      label: group.label,
      subsystem: group.subsystem,
      parent: true,
    },
    ...(group.children ?? []).map((child) => ({
      id: `${group.subsystem}-${toHealthItemId(child)}`,
      label: child,
      subsystem: group.subsystem,
      parentLabel: group.label,
    })),
  ]),
];

const REPORT_HEALTH_SECTIONS = [
  ...VEHICLE_HEALTH_GROUPS.filter((group) => group.children?.length).map((group) => ({
    id: group.subsystem,
    label: group.label,
    parent: {
      id: group.subsystem,
      label: group.label,
      subsystem: group.subsystem,
      parent: true,
    },
    children: group.children.map((child) => ({
      id: `${group.subsystem}-${toHealthItemId(child)}`,
      label: child,
      subsystem: group.subsystem,
      parentLabel: group.label,
    })),
  })),
  {
    id: "power-actuation",
    label: "Power & Actuation",
    items: VEHICLE_HEALTH_GROUPS.filter((group) => !group.children?.length).map((group) => ({
      id: group.subsystem,
      label: group.label,
      subsystem: group.subsystem,
      parent: true,
    })),
  },
];

const FAILURE_IMPORTANCE_BY_SUBSYSTEM = {
  engine: { rank: 4, label: "Very high" },
  battery: { rank: 3, label: "High" },
  hydraulics: { rank: 3, label: "High" },
  chassis: { rank: 2, label: "Medium" },
  sensors: { rank: 1, label: "Low" },
};

const REPORT_FAILURE_ITEMS = REPORT_HEALTH_ITEMS.filter((item) => !item.overall);

const reasonNumber = (value, digits = 0) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "0";
  return digits > 0 ? parsed.toFixed(digits) : String(Math.round(parsed));
};

const RESEARCH_SOURCE_NOTE = "research/Skunk Works v2.pdf and research/Skunk Works v2 copy.pdf";

const RESEARCH_MECHANISMS = {
  extreme_heat: {
    engine: "Oil thins, cooling system overloads, intake air is less dense, and engine power drops.",
    battery: "Permanent capacity reduction from sustained high-temperature exposure.",
    hydraulics: "Hydraulic fluid thins and seals degrade under heat load.",
    default: "Extreme heat degrades engine performance and accelerates thermal wear.",
  },
  extreme_cold: {
    engine: "Cold starts fail, oil thickens, and fuel gels.",
    battery: "Immediate capacity drop and reduced charge acceptance.",
    hydraulics: "Hydraulic fluid becomes sluggish and actuators can fail.",
    default: "Extreme cold kills battery and hydraulic reliability and stresses startup systems.",
  },
  dust_ingestion: {
    engine: "Filters clog, engines overheat, and abrasive particles score cylinder walls.",
    sensors: "Optical surfaces are scratched or obscured, and radar antenna elements clog.",
    default: "Dust ingestion clogs filters and blocks exposed surfaces.",
  },
  humidity: {
    sensors: "Moisture enters connectors, condensation forms on optics, and electrical contacts corrode.",
    chassis: "Rust forms at weld points and joints; hatch seals degrade.",
    default: "Moisture gets into connectors, corrodes metal contacts, and creates heat buildup.",
  },
  salinity: {
    chassis: "Salinity accelerates corrosion at welds, joints, underbelly, and metal contacts.",
    sensors: "Salt exposure destroys electrical contacts and connector reliability.",
    default: "Salinity accelerates corrosion on metal and destroys electrical contacts.",
  },
  uv_solar_radiation: {
    sensors: "Optical coatings on cameras, rangefinders, and periscopes degrade; accuracy drifts.",
    hydraulics: "External hoses, rubber seals, and gaskets shrink or become brittle.",
    battery: "Sustained solar heat load causes permanent battery capacity reduction.",
    default: "UV and solar radiation shrink rubber seals and degrade optical coatings.",
  },
};

const researchMechanismForFactor = (factorId, subsystem) => (
  RESEARCH_MECHANISMS[factorId]?.[subsystem] ??
  RESEARCH_MECHANISMS[factorId]?.default ??
  "Environmental exposure degrades this component."
);

const ENVIRONMENT_FAILURE_FACTORS = [
  {
    id: "extremeHeat",
    label: "Extreme heat",
    isActive: (inputs) => Number(inputs?.temperatureF) >= 100,
    describe: (inputs) => `Extreme heat ${reasonNumber(inputs?.temperatureF)}°F: oil thinning, cooling overload, thermal capacity loss`,
  },
  {
    id: "extremeCold",
    label: "Extreme cold",
    isActive: (inputs) => Number(inputs?.temperatureF) <= 32,
    describe: (inputs) => `Extreme cold ${reasonNumber(inputs?.temperatureF)}°F: cold starts fail, oil thickens, capacity drops`,
  },
  {
    id: "dustIngestion",
    label: "Dust ingestion",
    isActive: (inputs) => Number(inputs?.dustMgM3) >= 4,
    describe: (inputs) => `Dust ${reasonNumber(inputs?.dustMgM3, 1)} mg/m³: filters clog, engines overheat, optics/radar foul`,
  },
  {
    id: "humidity",
    label: "Humidity",
    isActive: (inputs) => Number(inputs?.relativeHumidityPct) >= 70,
    describe: (inputs) => `Humidity ${reasonNumber(inputs?.relativeHumidityPct)}%: connector moisture, contact corrosion, optical condensation`,
  },
  {
    id: "salinity",
    label: "Salinity",
    isActive: (inputs) => Number(inputs?.salinityPct) >= 0.5,
    describe: (inputs) => `Salinity ${reasonNumber(inputs?.salinityPct, 1)}%: weld, joint, underbelly, and contact corrosion`,
  },
  {
    id: "uvSolarRadiation",
    label: "UV / solar radiation",
    isActive: (inputs) => Number(inputs?.uvWm2) >= 500,
    describe: (inputs) => `UV / solar ${reasonNumber(inputs?.uvWm2)} W/m²: seal shrinkage, brittle hoses, optical coating loss`,
  },
];

const FAILURE_FACTOR_IDS_BY_SUBSYSTEM = {
  engine: ["extremeHeat", "extremeCold", "dustIngestion"],
  battery: ["extremeHeat", "extremeCold", "uvSolarRadiation"],
  hydraulics: ["extremeHeat", "extremeCold", "uvSolarRadiation"],
  sensors: ["dustIngestion", "humidity", "uvSolarRadiation"],
  chassis: ["extremeCold", "humidity", "salinity"],
};

const ENVIRONMENT_FIELDS = [
  {
    id: "temperatureF",
    symbol: "T(t)",
    label: "Temperature",
    min: -80,
    max: 170,
    step: 0.1,
    minLabel: "Extreme -80°F",
    maxLabel: "Extreme 170°F",
    accent: "#60a5fa",
    accentRgb: "96,165,250",
    format: (value) => `${value.toFixed(1)}°F`,
  },
  {
    id: "dustMgM3",
    symbol: "D(t)",
    label: "Dust concentration",
    min: 0,
    max: 10,
    step: 0.01,
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
    step: 0.1,
    minLabel: "0%",
    maxLabel: "100%",
    accent: "#22c55e",
    accentRgb: "34,197,94",
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    id: "salinityPct",
    symbol: "σ(t)",
    label: "Salinity concentration",
    min: 0,
    max: 10,
    step: 0.01,
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
    step: 1,
    minLabel: "0 W/m²",
    maxLabel: "Peak solar 1000 W/m²",
    accent: "#eab308",
    accentRgb: "234,179,8",
    format: (value) => `${Math.round(value)} W/m²`,
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

const healthHue = (value) => Math.round(clampHealthUnit(value) * 120);

const healthColor = (value, lightness = 55, alpha = null) => {
  const alphaSuffix = alpha === null ? "" : ` / ${alpha}`;
  return `hsl(${healthHue(value)} 84% ${lightness}%${alphaSuffix})`;
};

const healthColorStyle = (value) => ({
  "--health-color": healthColor(value),
  "--health-color-hi": healthColor(value, 68),
  "--health-color-soft": healthColor(value, 55, 0.16),
  "--health-color-border": healthColor(value, 55, 0.32),
  "--health-color-shadow": healthColor(value, 55, 0.34),
});

const hslToRgb = (hue, saturation, lightness) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (huePrime < 1) [r, g, b] = [chroma, x, 0];
  else if (huePrime < 2) [r, g, b] = [x, chroma, 0];
  else if (huePrime < 3) [r, g, b] = [0, chroma, x];
  else if (huePrime < 4) [r, g, b] = [0, x, chroma];
  else if (huePrime < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const match = lightness - chroma / 2;
  return [r + match, g + match, b + match];
};

const pdfNumber = (value) => Number(value).toFixed(2);

const pdfEscapeText = (value) => (
  String(value)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
);

const truncatePdfText = (value, maxLength) => {
  const text = String(value).replace(/[^\x20-\x7E]/g, " ");
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
};

const sanitizePdfFilePart = (value) => (
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "simulation"
);

const pdfRgbForHealth = (value) => {
  const [r, g, b] = hslToRgb(healthHue(value), 0.84, 0.48);
  return `${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)}`;
};

const parsePhysicsSnapshot = (snapshotJson) => {
  try {
    const parsed = JSON.parse(snapshotJson);
    if (parsed && parsed.subsystems) return parsed;
  } catch (error) {
    console.error("Unable to parse physics engine snapshot", error);
  }
  return DEFAULT_HEALTH_SNAPSHOT;
};

const normalizeDiagnostics = (diagnostics) => ({
  subsystems: Object.fromEntries(
    Object.keys(DEFAULT_HEALTH_SNAPSHOT.subsystems).map((subsystem) => {
      const subsystemDiagnostics = diagnostics?.subsystems?.[subsystem] ?? {};
      const factors = Array.isArray(subsystemDiagnostics.factors)
        ? subsystemDiagnostics.factors
            .map((factor) => ({
              id: String(factor.id ?? factor.label ?? "factor"),
              label: String(factor.label ?? factor.id ?? "Environmental factor"),
              dx_dt: Number.isFinite(Number(factor.dx_dt)) ? Number(factor.dx_dt) : 0,
            }))
            .filter((factor) => Math.abs(factor.dx_dt) > 0)
        : [];

      return [
        subsystem,
        {
          dx_dt: Number.isFinite(Number(subsystemDiagnostics.dx_dt))
            ? Number(subsystemDiagnostics.dx_dt)
            : 0,
          factors,
        },
      ];
    }),
  ),
});

const parsePhysicsDiagnostics = (diagnosticsJson) => {
  if (!diagnosticsJson) return DEFAULT_DIAGNOSTICS;

  try {
    const parsed = JSON.parse(diagnosticsJson);
    if (parsed && parsed.subsystems) return normalizeDiagnostics(parsed);
  } catch (error) {
    console.error("Unable to parse physics engine diagnostics", error);
  }
  return DEFAULT_DIAGNOSTICS;
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

const celsiusToFahrenheit = (temperatureC) => (temperatureC * (9 / 5)) + 32;

const formatDiagnosticDecimal = (value, maxDigits = 4) => {
  const numericValue = Math.abs(Number(value) || 0);
  if (numericValue === 0) return "0";
  if (numericValue >= 10) return numericValue.toFixed(2);
  if (numericValue >= 1) return numericValue.toFixed(3);
  return numericValue.toFixed(maxDigits);
};

const formatSignedFixed = (value, digits = 6) => {
  const numericValue = Number(value) || 0;
  if (Math.abs(numericValue) < Number(`1e-${digits}`)) return (0).toFixed(digits);
  const sign = numericValue > 0 ? "+" : "-";
  return `${sign}${Math.abs(numericValue).toFixed(digits)}`;
};

const formatAppliedIntegrityChange = (value) => {
  const scaledValue = (Number(value) || 0) * PHYSICS_DEGRADATION_SCALE;
  return `${formatSignedFixed(scaledValue, 6)} integrity/day`;
};

const formatAppliedFactorChange = (value) => {
  const scaledValue = (Number(value) || 0) * PHYSICS_DEGRADATION_SCALE;
  return `${formatSignedFixed(scaledValue, 6)} integrity/day`;
};

const formatCoefficient = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";
  if (Math.abs(numericValue) >= 1) return numericValue.toFixed(3);
  return numericValue.toPrecision(3);
};

function DiagnosticFormula({ label, coefficient, children }) {
  return (
    <span className="health-diagnostics__formula" aria-label={label}>
      <span className="health-diagnostics__formula-lhs">
        <span className="health-diagnostics__math-frac">
          <span>dx</span>
          <span>dt</span>
        </span>
      </span>
      <span className="health-diagnostics__math-op">=</span>
      <span className="health-diagnostics__math-op">-</span>
      <span className="health-diagnostics__math-coeff">{coefficient}</span>
      <span className="health-diagnostics__math-op">&middot;</span>
      <span className="health-diagnostics__formula-term">{children}</span>
    </span>
  );
}

const environmentSnapshotValues = (snapshot) => {
  const environment = snapshot?.environment ?? {};
  return {
    temperatureC: Number.isFinite(Number(environment.temperature_c))
      ? Number(environment.temperature_c)
      : null,
    temperatureF: Number.isFinite(Number(environment.temperature_c))
      ? celsiusToFahrenheit(Number(environment.temperature_c))
      : null,
    particulateConcentration: Number.isFinite(Number(environment.particulate_concentration))
      ? Number(environment.particulate_concentration)
      : null,
    particulateMgM3: Number.isFinite(Number(environment.particulate_concentration))
      ? Number(environment.particulate_concentration) * 1000
      : null,
    humidityRatio: Number.isFinite(Number(environment.relative_humidity))
      ? Number(environment.relative_humidity)
      : null,
    salinityFraction: Number.isFinite(Number(environment.salinity_concentration))
      ? Number(environment.salinity_concentration)
      : null,
    irradianceNormalized: Number.isFinite(Number(environment.irradiance))
      ? Number(environment.irradiance)
      : null,
    irradianceWm2: Number.isFinite(Number(environment.irradiance))
      ? Number(environment.irradiance) * 1000
      : null,
  };
};

const DIAGNOSTIC_FACTOR_DETAILS = {
  extreme_heat: {
    coefficientBySubsystem: {
      engine: "engine_heat",
      battery: "battery_heat",
      hydraulics: "hydraulics_heat",
    },
    thresholdBySubsystem: {
      engine: "engine_heat_c",
      battery: "battery_heat_c",
      hydraulics: "hydraulics_heat_c",
    },
    describe: ({ snapshot, subsystem, coefficientKey, thresholdKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const threshold = snapshot?.thresholds?.[thresholdKey];
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const marginText = Number.isFinite(environment.temperatureC) && Number.isFinite(Number(threshold))
        ? `${formatDiagnosticDecimal(environment.temperatureC - Number(threshold), 3)} C above limit`
        : "above the material limit";
      const temperatureC = Number.isFinite(environment.temperatureC)
        ? environment.temperatureC.toFixed(3)
        : "unknown";
      const limitC = Number.isFinite(Number(threshold)) ? Number(threshold).toFixed(3) : "unknown";
      return {
        input: `T ${temperatureC} C (${Math.round(environment.temperatureF ?? 0)} deg F); limit ${limitC} C; ${marginText}`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times max of zero and temperature minus heat limit`}
          >
            <span className="health-diagnostics__math-fn">max</span>
            <span>(0, <var>T</var><sub>C</sub> - <var>T</var><sub>heat</sub>)</span>
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("extreme_heat", subsystem),
      };
    },
  },
  extreme_cold: {
    coefficientBySubsystem: {
      engine: "engine_cold",
      battery: "battery_cold",
      hydraulics: "hydraulics_cold",
    },
    thresholdBySubsystem: {
      engine: "engine_cold_c",
      battery: "battery_cold_c",
      hydraulics: "hydraulics_cold_c",
    },
    describe: ({ snapshot, subsystem, coefficientKey, thresholdKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const threshold = snapshot?.thresholds?.[thresholdKey];
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const marginText = Number.isFinite(environment.temperatureC) && Number.isFinite(Number(threshold))
        ? `${formatDiagnosticDecimal(Number(threshold) - environment.temperatureC, 3)} C below limit`
        : "below the material limit";
      const temperatureC = Number.isFinite(environment.temperatureC)
        ? environment.temperatureC.toFixed(3)
        : "unknown";
      const limitC = Number.isFinite(Number(threshold)) ? Number(threshold).toFixed(3) : "unknown";
      return {
        input: `T ${temperatureC} C (${Math.round(environment.temperatureF ?? 0)} deg F); limit ${limitC} C; ${marginText}`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times max of zero and cold limit minus temperature`}
          >
            <span className="health-diagnostics__math-fn">max</span>
            <span>(0, <var>T</var><sub>cold</sub> - <var>T</var><sub>C</sub>)</span>
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("extreme_cold", subsystem),
      };
    },
  },
  dust_ingestion: {
    coefficientBySubsystem: {
      engine: "engine_dust",
      sensors: "sensors_dust",
    },
    describe: ({ snapshot, subsystem, coefficientKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const dust = Number.isFinite(environment.particulateMgM3)
        ? environment.particulateMgM3.toFixed(2)
        : "unknown";
      const modelDust = Number.isFinite(environment.particulateConcentration)
        ? environment.particulateConcentration.toFixed(6)
        : "unknown";
      return {
        input: `d ${modelDust} normalized (${dust} mg/m3)`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times particulate concentration`}
          >
            <var>d</var>
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("dust_ingestion", subsystem),
      };
    },
  },
  humidity: {
    coefficientBySubsystem: {
      sensors: "sensors_humidity",
      chassis: "chassis_humidity",
    },
    thresholdBySubsystem: {
      sensors: "sensors_humidity",
      chassis: "chassis_humidity",
    },
    describe: ({ snapshot, subsystem, coefficientKey, thresholdKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const threshold = Number(snapshot?.thresholds?.[thresholdKey] ?? 0);
      const humidity = Number.isFinite(environment.humidityRatio)
        ? environment.humidityRatio.toFixed(3)
        : "unknown";
      const excess = Number.isFinite(environment.humidityRatio)
        ? Math.max(0, environment.humidityRatio - threshold).toFixed(3)
        : "unknown";
      return {
        input: `y ${humidity} RH; threshold ${threshold.toFixed(3)}; excess ${excess}`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times max of zero and humidity minus threshold`}
          >
            <span className="health-diagnostics__math-fn">max</span>
            <span>(0, <var>y</var> - <var>y</var><sub>thr</sub>)</span>
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("humidity", subsystem),
      };
    },
  },
  salinity: {
    coefficientBySubsystem: {
      chassis: "chassis_salinity",
    },
    describe: ({ snapshot, subsystem, coefficientKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const salinity = Number.isFinite(environment.salinityFraction)
        ? environment.salinityFraction.toFixed(4)
        : "unknown";
      return {
        input: `sigma ${salinity} salinity fraction`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times salinity squared`}
          >
            <var>&sigma;</var><sup>2</sup>
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("salinity", subsystem),
      };
    },
  },
  uv_solar_radiation: {
    coefficientBySubsystem: {
      battery: "battery_uv",
      hydraulics: "hydraulics_uv",
      sensors: "sensors_uv",
    },
    describe: ({ snapshot, subsystem, coefficientKey }) => {
      const environment = environmentSnapshotValues(snapshot);
      const coefficient = snapshot?.coefficients?.[coefficientKey];
      const irradiance = Number.isFinite(environment.irradianceWm2)
        ? Math.round(environment.irradianceWm2)
        : "unknown";
      const modelIrradiance = Number.isFinite(environment.irradianceNormalized)
        ? environment.irradianceNormalized.toFixed(6)
        : "unknown";
      const formula = subsystem === "battery" ? "irradiance squared" : "irradiance";
      const engineFormula = subsystem === "battery" ? "u^2" : "u";
      return {
        input: `u ${modelIrradiance} normalized (${irradiance} W/m2)`,
        formula: (
          <DiagnosticFormula
            coefficient={formatCoefficient(coefficient)}
            label={`dx over dt equals -${formatCoefficient(coefficient)} times ${formula}`}
          >
            <var>u</var>{engineFormula === "u^2" && <sup>2</sup>}
          </DiagnosticFormula>
        ),
        mechanism: researchMechanismForFactor("uv_solar_radiation", subsystem),
      };
    },
  },
};

const describeDiagnosticFactor = (factor, subsystem, snapshot) => {
  const detail = DIAGNOSTIC_FACTOR_DETAILS[factor?.id];
  if (!detail) {
    return {
      input: "Active in engine diagnostics",
      formula: (
        <DiagnosticFormula coefficient="k" label="dx over dt equals -k times active stress term">
          <var>s</var>
        </DiagnosticFormula>
      ),
      mechanism: "Environmental degradation is being applied to this component.",
    };
  }

  const coefficientKey = detail.coefficientBySubsystem?.[subsystem];
  const thresholdKey = detail.thresholdBySubsystem?.[subsystem];
  if (!coefficientKey && detail.coefficientBySubsystem) {
    return {
      input: "No mapped coefficient",
      formula: (
        <DiagnosticFormula coefficient="0" label="dx over dt equals zero times active stress term">
          <var>s</var>
        </DiagnosticFormula>
      ),
      mechanism: "This driver is active elsewhere but not mapped to this component.",
    };
  }

  return detail.describe({
    factor,
    subsystem,
    snapshot,
    coefficientKey,
    thresholdKey,
  });
};

const healthValueForItem = (snapshot, item) => {
  if (item.overall) return clampHealthUnit(snapshot?.vehicle_health ?? 1);
  return clampHealthUnit(snapshot?.subsystems?.[item.subsystem] ?? snapshot?.vehicle_health ?? 1);
};

const failedDayForItem = (series, item) => {
  const breakPoint = series.find((point) => (
    healthValueForItem(point.snapshot, item) <= BROKEN_HEALTH_THRESHOLD
  ));
  return breakPoint ? Math.max(0, Math.ceil(breakPoint.day)) : null;
};

const importanceForItem = (item) => (
  FAILURE_IMPORTANCE_BY_SUBSYSTEM[item.subsystem] ?? { rank: 1, label: "Low" }
);

const failureReasonForItem = (item, inputs, durationDays) => {
  const factorIds = FAILURE_FACTOR_IDS_BY_SUBSYSTEM[item.subsystem] ?? [];
  const matchedFactors = ENVIRONMENT_FAILURE_FACTORS.filter((factor) => (
    factorIds.includes(factor.id) && factor.isActive(inputs ?? {})
  ));

  if (matchedFactors.length) {
    return matchedFactors.map((factor) => factor.describe(inputs ?? {})).join("; ");
  }

  return `Cumulative exposure over ${durationDays} days`;
};

const buildFailureSummary = (series, inputs = {}, durationDays = 0) => (
  REPORT_FAILURE_ITEMS
    .map((item) => ({
      ...item,
      failedDay: failedDayForItem(series, item),
      importance: importanceForItem(item),
      reason: failureReasonForItem(item, inputs, durationDays),
    }))
    .filter((item) => item.failedDay !== null)
    .sort((a, b) => (
      b.importance.rank - a.importance.rank ||
      a.failedDay - b.failedDay ||
      a.label.localeCompare(b.label)
    ))
);

const missionStatusLabel = (failureCount) => (
  failureCount > 0
    ? `${failureCount} Critical Components Failed`
    : "Mission Passed"
);

const buildTrendPoints = (series, item, yOffset = 0) => {
  if (!series.length) return "";
  const minDay = series[0].day;
  const maxDay = series[series.length - 1].day;
  const daySpan = Math.max(1, maxDay - minDay);

  return series
    .map((point, index) => {
      const x = ((point.day - minDay) / daySpan) * REPORT_CHART_WIDTH;
      const y = (1 - healthValueForItem(point.snapshot, item)) * REPORT_CHART_HEIGHT + yOffset;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const pdfFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pdfFormatNumber = (value, digits = 6) => pdfFiniteNumber(value).toFixed(digits);

const pdfFormatSignedNumber = (value, digits = 6) => {
  const parsed = pdfFiniteNumber(value);
  if (Math.abs(parsed) < Number(`1e-${digits}`)) return (0).toFixed(digits);
  return `${parsed > 0 ? "+" : "-"}${Math.abs(parsed).toFixed(digits)}`;
};

const wrapPdfText = (value, maxChars) => {
  const words = String(value).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [""];
};

const pdfReportInputs = (report, snapshot) => {
  const environment = snapshot?.environment ?? {};
  const inputs = report?.inputs ?? {};
  const temperatureC = Number.isFinite(Number(environment.temperature_c))
    ? Number(environment.temperature_c)
    : fahrenheitToCelsius(Number(inputs.temperatureF) || 0);
  const particulate = Number.isFinite(Number(environment.particulate_concentration))
    ? Number(environment.particulate_concentration)
    : (Number(inputs.dustMgM3) || 0) / 1000;
  const humidity = Number.isFinite(Number(environment.relative_humidity))
    ? Number(environment.relative_humidity)
    : (Number(inputs.relativeHumidityPct) || 0) / 100;
  const salinity = Number.isFinite(Number(environment.salinity_concentration))
    ? Number(environment.salinity_concentration)
    : (Number(inputs.salinityPct) || 0) / 100;
  const irradiance = Number.isFinite(Number(environment.irradiance))
    ? Number(environment.irradiance)
    : (Number(inputs.uvWm2) || 0) / 1000;

  return {
    temperatureC,
    temperatureF: celsiusToFahrenheit(temperatureC),
    particulate,
    particulateMgM3: particulate * 1000,
    humidity,
    salinity,
    irradiance,
    irradianceWm2: irradiance * 1000,
  };
};

const pdfTerm = (label, coefficient, stress, why) => {
  const k = pdfFiniteNumber(coefficient);
  const s = pdfFiniteNumber(stress);
  const raw = -k * s;
  return {
    label,
    coefficient: k,
    stress: s,
    raw,
    daily: raw * PHYSICS_DEGRADATION_SCALE,
    why,
  };
};

const pdfColdStress = (threshold, temperatureC) => (
  Number.isFinite(Number(threshold)) ? Math.max(0, Number(threshold) - temperatureC) : 0
);

const buildPdfPhysicsCards = (report, finalSnapshot) => {
  const c = finalSnapshot?.coefficients ?? {};
  const t = finalSnapshot?.thresholds ?? {};
  const input = pdfReportInputs(report, finalSnapshot);
  const heatStress = (threshold) => Math.max(0, input.temperatureC - pdfFiniteNumber(threshold));
  const humidityStress = (threshold) => Math.max(0, input.humidity - pdfFiniteNumber(threshold));
  const card = (id, label, components, equation, terms, why) => {
    const dxdt = terms.reduce((sum, term) => sum + term.raw, 0);
    return {
      id,
      label,
      components,
      equation,
      terms,
      dxdt,
      daily: dxdt * PHYSICS_DEGRADATION_SCALE,
      health: clampHealthUnit(finalSnapshot?.subsystems?.[id] ?? finalSnapshot?.vehicle_health ?? 1),
      why,
    };
  };

  return {
    input,
    cards: [
      card(
        "engine",
        "Engine",
        "Engine",
        "dx_engine/dt = -k_heat*max(0,T_C-T_heat) - k_cold*max(0,T_cold-T_C) - k_dust*d",
        [
          pdfTerm("heat", c.engine_heat, heatStress(t.engine_heat_c), researchMechanismForFactor("extreme_heat", "engine")),
          pdfTerm("cold", c.engine_cold, pdfColdStress(t.engine_cold_c, input.temperatureC), researchMechanismForFactor("extreme_cold", "engine")),
          pdfTerm("dust", c.engine_dust, input.particulate, researchMechanismForFactor("dust_ingestion", "engine")),
        ],
        "Engine degrades from thermal margin loss and abrasive intake contamination.",
      ),
      card(
        "battery",
        "Battery",
        "Battery",
        "dx_battery/dt = -k_heat*max(0,T_C-T_heat) - k_cold*max(0,T_cold-T_C) - k_uv*u^2",
        [
          pdfTerm("heat", c.battery_heat, heatStress(t.battery_heat_c), researchMechanismForFactor("extreme_heat", "battery")),
          pdfTerm("cold", c.battery_cold, pdfColdStress(t.battery_cold_c, input.temperatureC), researchMechanismForFactor("extreme_cold", "battery")),
          pdfTerm("uv", c.battery_uv, input.irradiance ** 2, researchMechanismForFactor("uv_solar_radiation", "battery")),
        ],
        "Battery degrades from temperature-driven capacity loss and solar heat loading.",
      ),
      card(
        "hydraulics",
        "Hydraulics",
        "Hydraulics",
        "dx_hydraulics/dt = -k_heat*max(0,T_C-T_heat) - k_cold*max(0,T_cold-T_C) - k_uv*u",
        [
          pdfTerm("heat", c.hydraulics_heat, heatStress(t.hydraulics_heat_c), researchMechanismForFactor("extreme_heat", "hydraulics")),
          pdfTerm("cold", c.hydraulics_cold, pdfColdStress(t.hydraulics_cold_c, input.temperatureC), researchMechanismForFactor("extreme_cold", "hydraulics")),
          pdfTerm("uv", c.hydraulics_uv, input.irradiance, researchMechanismForFactor("uv_solar_radiation", "hydraulics")),
        ],
        "Hydraulics degrade from fluid viscosity shifts, seal damage, actuator sluggishness, and UV hose aging.",
      ),
      card(
        "sensors",
        "Sensors",
        "Thermal, Radar, Acoustic, GPS, Camera",
        "dx_sensors/dt = -k_dust*d - k_humidity*max(0,y-y_thr) - k_uv*u",
        [
          pdfTerm("dust", c.sensors_dust, input.particulate, researchMechanismForFactor("dust_ingestion", "sensors")),
          pdfTerm("humidity", c.sensors_humidity, humidityStress(t.sensors_humidity), researchMechanismForFactor("humidity", "sensors")),
          pdfTerm("uv", c.sensors_uv, input.irradiance, researchMechanismForFactor("uv_solar_radiation", "sensors")),
        ],
        "Sensor subcomponents inherit this sensor equation because the engine tracks one sensor-health state.",
      ),
      card(
        "chassis",
        "Chassis",
        "Frame, Plating, Suspension, Underbelly, Track/wheels, Hatches/doors",
        "dx_chassis/dt = -k_humidity*max(0,y-y_thr) - k_salinity*sigma^2",
        [
          pdfTerm("humidity", c.chassis_humidity, humidityStress(t.chassis_humidity), researchMechanismForFactor("humidity", "chassis")),
          pdfTerm("salinity", c.chassis_salinity, input.salinity ** 2, researchMechanismForFactor("salinity", "chassis")),
        ],
        "Chassis subcomponents inherit this chassis equation because the engine tracks one chassis-health state.",
      ),
    ],
  };
};

const buildLegacyReportPdf = (report) => {
  const finalSnapshot = report.series[report.series.length - 1]?.snapshot ?? DEFAULT_HEALTH_SNAPSHOT;
  const finalHealth = clampHealthUnit(finalSnapshot.vehicle_health ?? 1);
  const content = [];
  const margin = 36;
  const columnGap = 18;
  const columnWidth = (PDF_PAGE_WIDTH - margin * 2 - columnGap) / 2;
  const cardHeight = 38;
  const cardGap = 5;
  const chartHeight = 13;
  const componentItems = REPORT_HEALTH_ITEMS.filter((item) => !item.overall);
  const lowestItem = componentItems.reduce((lowest, item) => {
    const currentValue = healthValueForItem(finalSnapshot, item);
    const lowestValue = healthValueForItem(finalSnapshot, lowest);
    return currentValue < lowestValue ? item : lowest;
  }, componentItems[0]);
  const averageFinalHealth =
    componentItems.reduce((sum, item) => sum + healthValueForItem(finalSnapshot, item), 0) /
    Math.max(1, componentItems.length);
  const failures = buildFailureSummary(report.series, report.inputs, report.durationDays);
  const reportTitle = `Contingency Report - ${missionStatusLabel(failures.length)}`;

  const setFill = (rgb) => content.push(`${rgb} rg`);
  const setStroke = (rgb) => content.push(`${rgb} RG`);
  const text = (value, x, y, size = 10, rgb = "0.10 0.14 0.22") => {
    setFill(rgb);
    content.push(`BT /F1 ${size} Tf 1 0 0 1 ${pdfNumber(x)} ${pdfNumber(y)} Tm (${pdfEscapeText(value)}) Tj ET`);
  };
  const line = (x1, y1, x2, y2, rgb = "0.82 0.86 0.91", width = 0.8) => {
    setStroke(rgb);
    content.push(`${pdfNumber(width)} w ${pdfNumber(x1)} ${pdfNumber(y1)} m ${pdfNumber(x2)} ${pdfNumber(y2)} l S`);
  };
  const strokedRect = (x, y, width, height, strokeRgb = "0.82 0.86 0.91", strokeWidth = 0.8) => {
    setStroke(strokeRgb);
    content.push(`${pdfNumber(strokeWidth)} w ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S`);
  };
  const filledRect = (x, y, width, height, fillRgb) => {
    setFill(fillRgb);
    content.push(`${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`);
  };
  const filledAndStrokedRect = (x, y, width, height, fillRgb, strokeRgb = "0.82 0.86 0.91") => {
    filledRect(x, y, width, height, fillRgb);
    strokedRect(x, y, width, height, strokeRgb);
  };
  const progressBar = (x, y, width, height, value, fillRgb) => {
    filledRect(x, y, width, height, "0.88 0.91 0.95");
    filledRect(x, y, width * clampHealthUnit(value), height, fillRgb);
  };
  const drawPdfComponentCard = (item, x, yTop, width, isChild = false) => {
    const y = yTop - cardHeight;
    const endHealth = healthValueForItem(finalSnapshot, item);
    const failedDay = failedDayForItem(report.series, item);
    const healthRgb = pdfRgbForHealth(endHealth);
    const chartX = x + 96;
    const chartY = y + 17;
    const chartWidth = width - 108;
    const minDay = report.series[0]?.day ?? 1;
    const maxDay = report.series[report.series.length - 1]?.day ?? report.durationDays;
    const daySpan = Math.max(1, maxDay - minDay);

    filledAndStrokedRect(x, y, width, cardHeight, "1.00 1.00 1.00", item.parent || item.overall ? healthRgb : "0.80 0.86 0.93");
    filledRect(x, y, 4, cardHeight, healthRgb);
    text(truncatePdfText(item.label, isChild ? 17 : 20), x + 12, y + 31, 8.4, "0.09 0.13 0.20");
    text(formatHealthPercent(endHealth), x + 12, y + 12, 10, healthRgb);
    progressBar(x + 48, y + 8, 34, 4, endHealth, healthRgb);

    const plotX = chartX + 13;
    const plotY = chartY + 6;
    const plotWidth = Math.max(10, chartWidth - 16);
    const plotHeight = Math.max(5, chartHeight - 4);
    line(plotX, plotY, plotX + plotWidth, plotY, "0.48 0.56 0.68", 0.5);
    line(plotX, plotY, plotX, plotY + plotHeight, "0.48 0.56 0.68", 0.5);
    line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight, "0.86 0.90 0.95", 0.35);
    text("100", chartX, plotY + plotHeight - 1.3, 3, "0.42 0.50 0.62");
    text("0", plotX - 5, plotY - 1.3, 3, "0.42 0.50 0.62");
    text(`D${Math.round(minDay)}`, plotX - 1, chartY + 0.8, 3, "0.42 0.50 0.62");
    text(`D${Math.round(maxDay)}`, plotX + plotWidth - 12, chartY + 0.8, 3, "0.42 0.50 0.62");

    const path = report.series.map((point, pointIndex) => {
      const health = healthValueForItem(point.snapshot, item);
      const pointX = plotX + ((point.day - minDay) / daySpan) * plotWidth;
      const pointY = plotY + health * plotHeight;
      return `${pdfNumber(pointX)} ${pdfNumber(pointY)} ${pointIndex === 0 ? "m" : "l"}`;
    }).join(" ");
    setStroke(healthRgb);
    content.push(`1.35 w ${path} S`);
    if (failedDay !== null) {
      text(`Failed day ${failedDay}`, chartX, y + 6, 6.2, "0.78 0.18 0.18");
    }

    return y - cardGap;
  };
  const drawPdfSection = (section, x, yTop, width) => {
    filledAndStrokedRect(x, yTop - 17, width, 17, "0.92 0.96 1.00", "0.76 0.84 0.94");
    text(section.label.toUpperCase(), x + 8, yTop - 11, 7.4, "0.20 0.39 0.72");
    let cursor = yTop - 23;

    if (section.parent) {
      cursor = drawPdfComponentCard(section.parent, x, cursor, width);
      for (const item of section.children) {
        cursor = drawPdfComponentCard(item, x + 10, cursor, width - 10, true);
      }
      return cursor;
    }

    for (const item of section.items) {
      cursor = drawPdfComponentCard(item, x, cursor, width);
    }
    return cursor;
  };
  const buildPhysicsPageContent = () => {
    const page = [];
    const physics = buildPdfPhysicsCards(report, finalSnapshot);
    const pageSetFill = (rgb) => page.push(`${rgb} rg`);
    const pageSetStroke = (rgb) => page.push(`${rgb} RG`);
    const pageText = (value, x, y, size = 10, rgb = "0.10 0.14 0.22") => {
      pageSetFill(rgb);
      page.push(`BT /F1 ${size} Tf 1 0 0 1 ${pdfNumber(x)} ${pdfNumber(y)} Tm (${pdfEscapeText(value)}) Tj ET`);
    };
    const pageLine = (x1, y1, x2, y2, rgb = "0.82 0.86 0.91", width = 0.8) => {
      pageSetStroke(rgb);
      page.push(`${pdfNumber(width)} w ${pdfNumber(x1)} ${pdfNumber(y1)} m ${pdfNumber(x2)} ${pdfNumber(y2)} l S`);
    };
    const pageStrokedRect = (x, y, width, height, strokeRgb = "0.82 0.86 0.91", strokeWidth = 0.8) => {
      pageSetStroke(strokeRgb);
      page.push(`${pdfNumber(strokeWidth)} w ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S`);
    };
    const pageFilledRect = (x, y, width, height, fillRgb) => {
      pageSetFill(fillRgb);
      page.push(`${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`);
    };
    const pageFilledAndStrokedRect = (x, y, width, height, fillRgb, strokeRgb = "0.82 0.86 0.91") => {
      pageFilledRect(x, y, width, height, fillRgb);
      pageStrokedRect(x, y, width, height, strokeRgb);
    };
    const pageWrappedText = (value, x, yTop, maxChars, size, rgb, lineHeight, maxLines = 4) => {
      const lines = wrapPdfText(value, maxChars).slice(0, maxLines);
      lines.forEach((lineText, index) => {
        const suffix = index === maxLines - 1 && wrapPdfText(value, maxChars).length > maxLines ? "..." : "";
        pageText(`${lineText}${suffix}`, x, yTop - index * lineHeight, size, rgb);
      });
      return yTop - lines.length * lineHeight;
    };
    const drawPhysicsCard = (card, x, yTop, width, height) => {
      const y = yTop - height;
      pageFilledAndStrokedRect(x, y, width, height, "1.00 1.00 1.00", "0.81 0.87 0.94");
      pageFilledRect(x, y, 4, height, pdfRgbForHealth(card.health));
      pageText(card.label.toUpperCase(), x + 10, yTop - 14, 8, "0.20 0.39 0.72");
      pageText(`${formatHealthPercent(card.health)} final | dx/dt ${pdfFormatSignedNumber(card.dxdt)} | daily ${pdfFormatSignedNumber(card.daily)}`, x + 10, yTop - 27, 6.2, "0.30 0.38 0.48");

      let cursor = pageWrappedText(`Components: ${card.components}`, x + 10, yTop - 40, 56, 5.7, "0.42 0.50 0.62", 7, 2);
      cursor = pageWrappedText(`Equation: ${card.equation}`, x + 10, cursor - 1, 62, 5.8, "0.08 0.13 0.22", 7, 2);
      pageLine(x + 10, cursor - 2, x + width - 10, cursor - 2, "0.88 0.91 0.95", 0.45);
      cursor -= 12;
      card.terms.forEach((term) => {
        cursor = pageWrappedText(
          `${term.label}: raw ${pdfFormatSignedNumber(term.raw)}; daily ${pdfFormatSignedNumber(term.daily)}; k ${pdfFormatNumber(term.coefficient)}; stress ${pdfFormatNumber(term.stress)}; ${term.why}`,
          x + 10,
          cursor,
          74,
          5.2,
          Math.abs(term.raw) > 0 ? "0.70 0.18 0.18" : "0.40 0.48 0.58",
          6.1,
          2,
        ) - 1;
      });
    };

    pageFilledRect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "0.96 0.98 1.00");
    pageFilledRect(0, 696, PDF_PAGE_WIDTH, 96, "0.05 0.09 0.16");
    pageFilledRect(0, 696, PDF_PAGE_WIDTH, 5, pdfRgbForHealth(finalHealth));
    pageText("LANDFORGE", margin, 762, 10, "0.58 0.76 0.96");
    pageText("Physics Equations At Work", margin, 734, 20, "0.96 0.98 1.00");
    pageText("Source: engine/src/modules/environmental.rs + engine/physics engine.pdf", margin, 716, 7.5, "0.72 0.82 0.94");

    pageFilledAndStrokedRect(margin, 612, PDF_PAGE_WIDTH - margin * 2, 68, "1.00 1.00 1.00", "0.82 0.88 0.95");
    pageText("RUN INPUTS AND UPDATE RULE", margin + 10, 663, 7.2, "0.20 0.39 0.72");
    pageText(`T_C=${pdfFormatNumber(physics.input.temperatureC, 3)} (${Math.round(physics.input.temperatureF)} F), d=${pdfFormatNumber(physics.input.particulate)} (${pdfFormatNumber(physics.input.particulateMgM3, 2)} mg/m3), y=${pdfFormatNumber(physics.input.humidity, 3)}, sigma=${pdfFormatNumber(physics.input.salinity, 4)}, u=${pdfFormatNumber(physics.input.irradiance)} (${Math.round(physics.input.irradianceWm2)} W/m2)`, margin + 10, 648, 6.2, "0.08 0.13 0.22");
    pageText(`Per simulated day: x_next = clamp(x + ${pdfFormatNumber(PHYSICS_DEGRADATION_SCALE, 1)}*(dx/dt), 0, 1). This is why daily delta = ${pdfFormatNumber(PHYSICS_DEGRADATION_SCALE, 1)}*(dx/dt).`, margin + 10, 634, 6.2, "0.08 0.13 0.22");
    pageText("Overall health = (4*engine + 3*battery + 3*hydraulics + 2*chassis + sensors) / 13.", margin + 10, 620, 6.2, "0.08 0.13 0.22");

    const physicsColumnWidth = (PDF_PAGE_WIDTH - margin * 2 - columnGap) / 2;
    const physicsCardHeight = 138;
    const leftCards = physics.cards.slice(0, 3);
    const rightCards = physics.cards.slice(3);
    leftCards.forEach((card, index) => {
      drawPhysicsCard(card, margin, 586 - index * (physicsCardHeight + 10), physicsColumnWidth, physicsCardHeight);
    });
    rightCards.forEach((card, index) => {
      drawPhysicsCard(card, margin + physicsColumnWidth + columnGap, 586 - index * (physicsCardHeight + 10), physicsColumnWidth, physicsCardHeight);
    });

    return page;
  };

  filledRect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "0.96 0.98 1.00");
  filledRect(0, 696, PDF_PAGE_WIDTH, 96, "0.05 0.09 0.16");
  filledRect(0, 696, PDF_PAGE_WIDTH, 5, pdfRgbForHealth(finalHealth));
  text("LANDFORGE", margin, 762, 10, "0.58 0.76 0.96");
  text(reportTitle, margin, 732, failures.length ? 18 : 21, "0.96 0.98 1.00");

  filledAndStrokedRect(428, 718, 148, 48, "0.09 0.14 0.23", "0.23 0.33 0.48");
  text("OVERALL HEALTH", 442, 749, 7.5, "0.62 0.72 0.84");
  text(formatHealthPercent(finalHealth), 442, 728, 22, pdfRgbForHealth(finalHealth));

  const tileY = 646;
  const tileWidth = (PDF_PAGE_WIDTH - margin * 2 - 20) / 3;
  const summaryTiles = [
    ["Unit", report.unitLabel, "0.20 0.39 0.72"],
    ["Duration", `${report.durationDays} days`, "0.23 0.55 0.34"],
    ["Material", report.material, "0.55 0.34 0.18"],
  ];
  summaryTiles.forEach(([label, value, accentRgb], index) => {
    const x = margin + index * (tileWidth + 10);
    filledAndStrokedRect(x, tileY, tileWidth, 34, "1.00 1.00 1.00", "0.82 0.88 0.95");
    filledRect(x, tileY, 4, 34, accentRgb);
    text(label.toUpperCase(), x + 12, tileY + 20, 6.8, "0.45 0.54 0.66");
    text(truncatePdfText(value, index === 2 ? 20 : 18), x + 12, tileY + 8, 9, "0.08 0.13 0.22");
  });

  const summaryY = 598;
  const healthTiles = [
    ["Fleet Average", formatHealthPercent(averageFinalHealth), pdfRgbForHealth(averageFinalHealth)],
    [
      "Lowest Component",
      truncatePdfText(lowestItem?.label ?? "N/A", 22),
      pdfRgbForHealth(healthValueForItem(finalSnapshot, lowestItem ?? REPORT_HEALTH_ITEMS[0])),
    ],
    ["Components Tracked", String(REPORT_HEALTH_ITEMS.length), "0.20 0.39 0.72"],
  ];
  healthTiles.forEach(([label, value, accentRgb], index) => {
    const x = margin + index * (tileWidth + 10);
    filledAndStrokedRect(x, summaryY, tileWidth, 34, "0.99 1.00 1.00", "0.82 0.88 0.95");
    text(label.toUpperCase(), x + 10, summaryY + 20, 6.8, "0.45 0.54 0.66");
    text(value, x + 10, summaryY + 8, 9.5, accentRgb);
  });

  const failureSummaryY = 536;
  filledAndStrokedRect(margin, failureSummaryY, PDF_PAGE_WIDTH - margin * 2, 48, "1.00 1.00 1.00", "0.82 0.88 0.95");
  text("MISSION SUMMARY", margin + 10, failureSummaryY + 36, 6.8, "0.20 0.39 0.72");
  if (!failures.length) {
    text("No failures", margin + 10, failureSummaryY + 18, 8, "0.42 0.50 0.62");
  } else {
    const visibleFailures = failures.slice(0, 8);
    const summaryColumnWidth = (PDF_PAGE_WIDTH - margin * 2 - 28) / 2;
    visibleFailures.forEach((failure, index) => {
      const columnIndex = Math.floor(index / 4);
      const rowIndex = index % 4;
      const x = margin + 10 + columnIndex * summaryColumnWidth;
      const y = failureSummaryY + 25 - rowIndex * 8;
      text(
        `${truncatePdfText(failure.label, 12)}  Day ${failure.failedDay}  ${failure.importance.label} - ${truncatePdfText(failure.reason, 26)}`,
        x,
        y,
        5.3,
        failure.importance.rank >= 4 ? "0.78 0.18 0.18" : "0.24 0.34 0.48",
      );
    });
    if (failures.length > visibleFailures.length) {
      text(`+${failures.length - visibleFailures.length} more`, margin + PDF_PAGE_WIDTH - margin * 2 - 22, failureSummaryY + 5, 5.8, "0.42 0.50 0.62");
    }
  }

  text("Component Health Trends", margin, 508, 12, "0.08 0.13 0.22");
  text("Each card shows the first simulated day the part failed.", margin, 494, 8, "0.42 0.50 0.62");

  const chassisSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "chassis");
  const sensorsSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "sensors");
  const powerSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "power-actuation");
  drawPdfSection(chassisSection, margin, 476, columnWidth);
  const sensorsBottom = drawPdfSection(sensorsSection, margin + columnWidth + columnGap, 476, columnWidth);
  drawPdfSection(powerSection, margin + columnWidth + columnGap, sensorsBottom - 14, columnWidth);

  const pageStreams = [
    content.join("\n"),
    buildPhysicsPageContent().join("\n"),
  ];
  const objects = [null, null, null, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageObjectIds = [];
  pageStreams.forEach((stream) => {
    const contentObjectId = objects.length;
    objects.push(`<< /Length ${stream.length + 1} >>\nstream\n${stream}\nendstream`);
    const pageObjectId = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    pageObjectIds.push(pageObjectId);
  });
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

const buildReportPdf = (report) => {
  const finalSnapshot = report.series[report.series.length - 1]?.snapshot ?? DEFAULT_HEALTH_SNAPSHOT;
  const finalHealth = clampHealthUnit(finalSnapshot.vehicle_health ?? 1);
  const failures = buildFailureSummary(report.series, report.inputs, report.durationDays);
  const physics = buildPdfPhysicsCards(report, finalSnapshot);
  const physicsBySubsystem = Object.fromEntries(physics.cards.map((card) => [card.id, card]));
  const componentItems = REPORT_HEALTH_ITEMS.filter((item) => !item.overall);
  const startDay = report.series[0]?.day ?? 0;
  const endDay = report.series[report.series.length - 1]?.day ?? report.durationDays;
  const daySpan = Math.max(1, endDay - startDay);
  const margin = 34;
  const pageCount = 5;
  const pageStreams = [];

  const itemById = Object.fromEntries(REPORT_HEALTH_ITEMS.map((item) => [item.id, item]));
  const parentItem = (subsystem) => (
    REPORT_HEALTH_ITEMS.find((item) => item.subsystem === subsystem && item.parent)
  );
  const childItem = (subsystem, label) => itemById[`${subsystem}-${toHealthItemId(label)}`];
  const chassisGroup = VEHICLE_HEALTH_GROUPS.find((group) => group.subsystem === "chassis");
  const sensorsGroup = VEHICLE_HEALTH_GROUPS.find((group) => group.subsystem === "sensors");
  const chassisItems = [parentItem("chassis"), ...(chassisGroup?.children ?? []).map((label) => childItem("chassis", label))].filter(Boolean);
  const sensorItems = [parentItem("sensors"), ...(sensorsGroup?.children ?? []).map((label) => childItem("sensors", label))].filter(Boolean);
  const powerItems = ["engine", "battery", "hydraulics"].map(parentItem).filter(Boolean);

  const componentNotes = {
    Chassis: "Shared structural health state for frame, plating, suspension, underbody, tracks/wheels, hatches, and doors.",
    Frame: "Humidity causes rust at weld points and joints; salinity accelerates metal corrosion.",
    Plating: "Salinity attacks metal plating; humidity drives coating breakdown and corrosion spread.",
    Suspension: "Joints and mounts inherit weld/joint corrosion; moisture and salt reduce mechanical margin.",
    Underbelly: "Underbelly is called out in research as a salinity corrosion target at welds and joints.",
    "Track / wheels": "Running gear inherits chassis corrosion and dust-driven mechanical contamination.",
    "Hatches & doors": "Research calls out hatch seal degradation from humidity and rubber/gasket shrinkage from UV.",
    Sensors: "Shared sensor health state for thermal, radar, acoustic, GPS, and camera packages.",
    Thermal: "Thermal optics inherit condensation, optical coating degradation, dust obscuration, and accuracy drift.",
    Radar: "Radar inherits clogged antenna elements from dust and corrosion on electrical contacts from humidity.",
    Acoustic: "Acoustic sensors inherit connector moisture and corrosion-driven reliability loss.",
    GPS: "GPS receiver and antenna contacts inherit connector moisture and electrical contact corrosion.",
    Camera: "Camera optics inherit dust scratching/obscuration, condensation, and UV optical coating degradation.",
    Engine: "Research calls out oil thinning, cooling overload, less dense intake air, filter clogging, and scored cylinder walls.",
    Battery: "Research calls out immediate cold capacity drop, reduced charge acceptance, and permanent heat/solar capacity loss.",
    Hydraulics: "Research calls out fluid thinning in heat, sluggish fluid in cold, actuator failure, seal degradation, and brittle hoses.",
  };

  const createPage = (title, subtitle, pageNumber) => {
    const ops = [];
    const setFill = (rgb) => ops.push(`${rgb} rg`);
    const setStroke = (rgb) => ops.push(`${rgb} RG`);
    const text = (value, x, y, size = 10, rgb = "0.10 0.14 0.22", font = "F1") => {
      setFill(rgb);
      ops.push(`BT /${font} ${size} Tf 1 0 0 1 ${pdfNumber(x)} ${pdfNumber(y)} Tm (${pdfEscapeText(value)}) Tj ET`);
    };
    const line = (x1, y1, x2, y2, rgb = "0.82 0.86 0.91", width = 0.8) => {
      setStroke(rgb);
      ops.push(`${pdfNumber(width)} w ${pdfNumber(x1)} ${pdfNumber(y1)} m ${pdfNumber(x2)} ${pdfNumber(y2)} l S`);
    };
    const rect = (x, y, width, height, fillRgb, strokeRgb = null, strokeWidth = 0.8) => {
      if (fillRgb) {
        setFill(fillRgb);
        ops.push(`${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`);
      }
      if (strokeRgb) {
        setStroke(strokeRgb);
        ops.push(`${pdfNumber(strokeWidth)} w ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S`);
      }
    };
    const wrappedText = (value, x, yTop, maxChars, size, rgb, lineHeight, maxLines = 4, font = "F1") => {
      const allLines = wrapPdfText(value, maxChars);
      const lines = allLines.slice(0, maxLines);
      lines.forEach((lineText, index) => {
        const suffix = index === maxLines - 1 && allLines.length > maxLines ? "..." : "";
        text(`${lineText}${suffix}`, x, yTop - index * lineHeight, size, rgb, font);
      });
      return yTop - lines.length * lineHeight;
    };

    rect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "0.96 0.98 1.00");
    rect(margin, 704, PDF_PAGE_WIDTH - margin * 2, 4, pdfRgbForHealth(finalHealth));
    text("LANDFORGE", margin, 764, 9, "0.20 0.39 0.72", "F2");
    text(title, margin, 740, 20, "0.08 0.13 0.22", "F2");
    text(subtitle, margin, 721, 7.5, "0.30 0.38 0.48");
    text(`Page ${pageNumber} of ${pageCount}`, PDF_PAGE_WIDTH - margin - 54, 721, 7.5, "0.30 0.38 0.48");
    text(`Sources: ${RESEARCH_SOURCE_NOTE}; engine equations from Rust source.`, margin, 28, 6.2, "0.48 0.56 0.68");

    return { ops, setFill, setStroke, text, line, rect, wrappedText };
  };

  const addPage = (page) => {
    pageStreams.push(page.ops.join("\n"));
  };

  const drawMetric = (page, x, y, width, height, label, value, accentRgb) => {
    page.rect(x, y, width, height, "1.00 1.00 1.00", "0.82 0.88 0.95");
    page.rect(x, y, 4, height, accentRgb);
    page.text(label.toUpperCase(), x + 11, y + height - 13, 6.6, "0.45 0.54 0.66", "F2");
    page.wrappedText(value, x + 11, y + height - 26, Math.max(12, Math.floor(width / 6)), 8.4, "0.08 0.13 0.22", 9, 2, "F2");
  };

  const drawTrend = (page, item, x, y, width, height) => {
    const healthRgb = pdfRgbForHealth(healthValueForItem(finalSnapshot, item));
    const leftPad = width < 84 ? 12 : 16;
    const bottomPad = height < 24 ? 7 : 9;
    const topPad = height < 24 ? 4 : 5;
    const rightPad = 3;
    const plotX = x + leftPad;
    const plotY = y + bottomPad;
    const plotWidth = Math.max(10, width - leftPad - rightPad);
    const plotHeight = Math.max(6, height - bottomPad - topPad);
    const labelSize = width < 84 ? 3 : 3.4;
    const startLabel = `D${Math.round(startDay)}`;
    const endLabel = `D${Math.round(endDay)}`;

    page.line(plotX, plotY, plotX + plotWidth, plotY, "0.48 0.56 0.68", 0.5);
    page.line(plotX, plotY, plotX, plotY + plotHeight, "0.48 0.56 0.68", 0.5);
    page.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight, "0.86 0.90 0.95", 0.35);
    page.line(plotX + plotWidth, plotY, plotX + plotWidth, plotY + plotHeight, "0.90 0.93 0.97", 0.25);
    page.text(width < 84 ? "%" : "Integrity", x, y + height - 2.5, labelSize, "0.30 0.38 0.48", "F2");
    page.text("100", x, plotY + plotHeight - 1.5, labelSize, "0.42 0.50 0.62");
    page.text("0", x + leftPad - 6, plotY - 1.5, labelSize, "0.42 0.50 0.62");
    page.text(startLabel, plotX - 1, y + 1.2, labelSize, "0.42 0.50 0.62");
    if (width >= 78) {
      page.text("Day", plotX + plotWidth * 0.45, y + 1.2, labelSize, "0.30 0.38 0.48", "F2");
    }
    page.text(endLabel, plotX + plotWidth - Math.min(16, endLabel.length * 2), y + 1.2, labelSize, "0.42 0.50 0.62");
    const path = report.series.map((point, index) => {
      const value = healthValueForItem(point.snapshot, item);
      const px = plotX + ((point.day - startDay) / daySpan) * plotWidth;
      const py = plotY + value * plotHeight;
      return `${pdfNumber(px)} ${pdfNumber(py)} ${index === 0 ? "m" : "l"}`;
    }).join(" ");
    page.setStroke(healthRgb);
    page.ops.push(`1.2 w ${path} S`);
  };

  const termLine = (term) => (
    `${term.label}: k=${pdfFormatNumber(term.coefficient, 5)} stress=${pdfFormatNumber(term.stress, 5)} dx/dt=${pdfFormatSignedNumber(term.raw, 6)} daily=${pdfFormatSignedNumber(term.daily, 6)}`
  );

  const drawTermRows = (page, card, x, yTop, width, maxRows = card.terms.length) => {
    let cursor = yTop;
    card.terms.slice(0, maxRows).forEach((term) => {
      const active = Math.abs(term.raw) > 0;
      page.wrappedText(termLine(term), x, cursor, Math.floor(width / 5.3), 5.5, active ? "0.70 0.18 0.18" : "0.42 0.50 0.62", 6.4, 1, "F2");
      cursor -= 7;
      cursor = page.wrappedText(term.why, x + 8, cursor, Math.floor((width - 8) / 5.7), 5.1, "0.35 0.43 0.54", 6, 2) - 1;
    });
    return cursor;
  };

  const drawEquationPanel = (page, card, x, yTop, width, height) => {
    const y = yTop - height;
    page.rect(x, y, width, height, "1.00 1.00 1.00", "0.81 0.87 0.94");
    page.rect(x, y, 4, height, pdfRgbForHealth(card.health));
    page.text(card.label.toUpperCase(), x + 10, yTop - 14, 8.2, "0.20 0.39 0.72", "F2");
    page.text(`${formatHealthPercent(card.health)} final | dx/dt ${pdfFormatSignedNumber(card.dxdt, 6)} | daily ${pdfFormatSignedNumber(card.daily, 6)}`, x + 10, yTop - 28, 6.1, "0.30 0.38 0.48", "F2");
    let cursor = page.wrappedText(card.equation, x + 10, yTop - 42, Math.floor((width - 20) / 5.4), 5.8, "0.08 0.13 0.22", 7, 2, "F2");
    page.line(x + 10, cursor - 2, x + width - 10, cursor - 2, "0.88 0.91 0.95", 0.45);
    drawTermRows(page, card, x + 10, cursor - 12, width - 20, card.terms.length);
  };

  const drawComponentCard = (page, item, card, x, yTop, width, height, note, compact = false) => {
    const y = yTop - height;
    const health = healthValueForItem(finalSnapshot, item);
    const healthRgb = pdfRgbForHealth(health);
    const failedDay = failedDayForItem(report.series, item);
    const modelLabel = item.parent ? "tracked subsystem" : `inherits ${card.label.toLowerCase()} state`;
    page.rect(x, y, width, height, "1.00 1.00 1.00", "0.82 0.88 0.95");
    page.rect(x, y, 4, height, healthRgb);
    page.text(item.label.toUpperCase(), x + 10, yTop - 13, compact ? 6.8 : 8, "0.08 0.13 0.22", "F2");
    page.text(`${formatHealthPercent(health)} final | ${failedDay === null ? "no failure" : `failed day ${failedDay}`}`, x + 10, yTop - 26, 6, healthRgb, "F2");
    page.text(modelLabel, x + 10, yTop - 38, 5.6, "0.40 0.48 0.58");
    drawTrend(page, item, x + width - (compact ? 108 : 176), yTop - (compact ? 48 : 54), compact ? 96 : 160, compact ? 30 : 40);
    let cursor = page.wrappedText(note, x + 10, yTop - 52, compact ? 38 : 68, 5.2, "0.32 0.40 0.50", 6, compact ? 2 : 3);
    if (!compact) {
      cursor = page.wrappedText(card.equation, x + 10, cursor - 2, Math.floor((width - 20) / 5.3), 5.3, "0.08 0.13 0.22", 6, 2, "F2");
      drawTermRows(page, card, x + 10, cursor - 5, width - 20, card.terms.length);
    }
  };

  const buildPdfObjects = () => {
    const objects = [
      null,
      null,
      null,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ];
    const pageObjectIds = [];
    pageStreams.forEach((stream) => {
      const contentObjectId = objects.length;
      objects.push(`<< /Length ${stream.length + 1} >>\nstream\n${stream}\nendstream`);
      const pageObjectId = objects.length;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
      pageObjectIds.push(pageObjectId);
    });
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 1; i < objects.length; i += 1) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  };

  const page1 = createPage("Contingency Report", missionStatusLabel(failures.length), 1);
  const tileWidth = (PDF_PAGE_WIDTH - margin * 2 - 24) / 4;
  drawMetric(page1, margin, 644, tileWidth, 46, "Overall", formatHealthPercent(finalHealth), pdfRgbForHealth(finalHealth));
  drawMetric(page1, margin + (tileWidth + 8), 644, tileWidth, 46, "Unit", report.unitLabel, "0.20 0.39 0.72");
  drawMetric(page1, margin + (tileWidth + 8) * 2, 644, tileWidth, 46, "Duration", `${report.durationDays} days`, "0.23 0.55 0.34");
  drawMetric(page1, margin + (tileWidth + 8) * 3, 644, tileWidth, 46, "Material", report.material, "0.55 0.34 0.18");
  page1.text("MISSION SUMMARY", margin, 614, 9, "0.20 0.39 0.72", "F2");
  page1.rect(margin, 492, PDF_PAGE_WIDTH - margin * 2, 108, "1.00 1.00 1.00", "0.82 0.88 0.95");
  if (!failures.length) {
    page1.text("No failures", margin + 12, 560, 12, "0.23 0.55 0.34", "F2");
    page1.wrappedText("All tracked critical components stayed above the failure threshold for the simulated duration.", margin + 12, 540, 74, 7, "0.34 0.42 0.52", 9, 3);
  } else {
    failures.slice(0, 12).forEach((failure, index) => {
      const col = Math.floor(index / 6);
      const row = index % 6;
      const x = margin + 12 + col * 260;
      const y = 578 - row * 14;
      page1.text(`${failure.label}: day ${failure.failedDay}, ${failure.importance.label}`, x, y, 6.6, failure.importance.rank >= 4 ? "0.75 0.16 0.16" : "0.24 0.34 0.48", "F2");
      page1.text(truncatePdfText(failure.reason, 42), x, y - 7, 5.4, "0.42 0.50 0.62");
    });
  }
  page1.text("CRITICAL COMPONENT INDEX", margin, 462, 9, "0.20 0.39 0.72", "F2");
  page1.rect(margin, 112, PDF_PAGE_WIDTH - margin * 2, 334, "1.00 1.00 1.00", "0.82 0.88 0.95");
  componentItems.forEach((item, index) => {
    const col = Math.floor(index / 8);
    const row = index % 8;
    const x = margin + 12 + col * 270;
    const y = 424 - row * 36;
    const health = healthValueForItem(finalSnapshot, item);
    const failedDay = failedDayForItem(report.series, item);
    page1.text(item.label, x, y, 7.2, "0.08 0.13 0.22", "F2");
    page1.text(`${formatHealthPercent(health)} final | ${failedDay === null ? "no failure" : `failed day ${failedDay}`} | model ${item.subsystem}`, x, y - 10, 6, pdfRgbForHealth(health));
    drawTrend(page1, item, x + 150, y - 20, 100, 22);
  });
  addPage(page1);

  const page2 = createPage("Physics Model", "Equations from Rust; mechanisms from research PDFs", 2);
  page2.rect(margin, 610, PDF_PAGE_WIDTH - margin * 2, 80, "1.00 1.00 1.00", "0.82 0.88 0.95");
  page2.text("RUN INPUTS", margin + 12, 672, 8, "0.20 0.39 0.72", "F2");
  page2.text(`T_C ${pdfFormatNumber(physics.input.temperatureC, 3)} (${Math.round(physics.input.temperatureF)} F)`, margin + 12, 654, 6.6, "0.08 0.13 0.22", "F2");
  page2.text(`d ${pdfFormatNumber(physics.input.particulate)} (${pdfFormatNumber(physics.input.particulateMgM3, 2)} mg/m3)`, margin + 190, 654, 6.6, "0.08 0.13 0.22", "F2");
  page2.text(`y ${pdfFormatNumber(physics.input.humidity, 3)} RH`, margin + 360, 654, 6.6, "0.08 0.13 0.22", "F2");
  page2.text(`sigma ${pdfFormatNumber(physics.input.salinity, 4)}`, margin + 12, 636, 6.6, "0.08 0.13 0.22", "F2");
  page2.text(`u ${pdfFormatNumber(physics.input.irradiance)} (${Math.round(physics.input.irradianceWm2)} W/m2)`, margin + 190, 636, 6.6, "0.08 0.13 0.22", "F2");
  page2.text(`Update: x_next = clamp(x + ${pdfFormatNumber(PHYSICS_DEGRADATION_SCALE, 1)}*(dx/dt), 0, 1)`, margin + 12, 618, 6.6, "0.08 0.13 0.22", "F2");
  page2.text("Overall health = (4*engine + 3*battery + 3*hydraulics + 2*chassis + sensors) / 13", margin + 12, 604, 6.4, "0.08 0.13 0.22");
  const eqWidth = (PDF_PAGE_WIDTH - margin * 2 - 14) / 2;
  physics.cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawEquationPanel(page2, card, margin + col * (eqWidth + 14), 578 - row * 156, eqWidth, 144);
  });
  addPage(page2);

  const page3 = createPage("Power And Propulsion Breakdown", "Engine, battery, and hydraulics critical component states", 3);
  powerItems.forEach((item, index) => {
    const card = physicsBySubsystem[item.subsystem];
    drawComponentCard(page3, item, card, margin, 672 - index * 194, PDF_PAGE_WIDTH - margin * 2, 178, componentNotes[item.label], false);
  });
  addPage(page3);

  const page4 = createPage("Chassis Breakdown", "Every chassis critical component uses the chassis physics state", 4);
  drawEquationPanel(page4, physicsBySubsystem.chassis, margin, 672, PDF_PAGE_WIDTH - margin * 2, 128);
  const gridWidth = (PDF_PAGE_WIDTH - margin * 2 - 14) / 2;
  chassisItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawComponentCard(page4, item, physicsBySubsystem.chassis, margin + col * (gridWidth + 14), 522 - row * 92, gridWidth, 80, componentNotes[item.label], true);
  });
  addPage(page4);

  const page5 = createPage("Sensor Breakdown", "Every sensor critical component uses the sensor physics state", 5);
  drawEquationPanel(page5, physicsBySubsystem.sensors, margin, 672, PDF_PAGE_WIDTH - margin * 2, 128);
  sensorItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawComponentCard(page5, item, physicsBySubsystem.sensors, margin + col * (gridWidth + 14), 522 - row * 98, gridWidth, 86, componentNotes[item.label], true);
  });
  page5.rect(margin, 90, PDF_PAGE_WIDTH - margin * 2, 78, "1.00 1.00 1.00", "0.82 0.88 0.95");
  page5.text("MODEL LIMITATION", margin + 12, 150, 7.4, "0.20 0.39 0.72", "F2");
  page5.wrappedText("The Rust engine tracks five health states: engine, battery, hydraulics, sensors, and chassis. Chassis and sensor subcomponents are reported separately for operators, but each subcomponent currently inherits its parent subsystem health and equation.", margin + 12, 134, 96, 6.4, "0.08 0.13 0.22", 8, 4);
  addPage(page5);

  return buildPdfObjects();
};

const downloadReportPdf = (report) => {
  const blob = new Blob([buildReportPdf(report)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `landforge-${sanitizePdfFilePart(report.theaterLabel)}-report.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function ComponentTrendCard({ item, series }) {
  const endHealth = healthValueForItem(series[series.length - 1]?.snapshot, item);
  const failedDay = failedDayForItem(series, item);
  const trendPath = buildTrendPoints(series, item);
  const trendShadowPath = buildTrendPoints(series, item, 3.5);

  return (
    <div
      className="report-card"
      data-parent={item.parent ? "true" : "false"}
      style={healthColorStyle(endHealth)}
    >
      <div className="report-card__top">
        <span>{item.label}</span>
        <strong>{formatHealthPercent(endHealth)}</strong>
      </div>
      <svg
        className="report-card__chart"
        viewBox={`0 0 ${REPORT_CHART_WIDTH} ${REPORT_CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1="0" x2={REPORT_CHART_WIDTH} y2="0" />
        <line
          x1="0"
          y1={REPORT_CHART_HEIGHT}
          x2={REPORT_CHART_WIDTH}
          y2={REPORT_CHART_HEIGHT}
        />
        <path className="report-card__chart-shadow" d={trendShadowPath} />
        <path className="report-card__chart-line" d={trendPath} />
      </svg>
      {failedDay !== null && (
        <div className="report-card__delta">
          <span>Failure day</span>
          <strong>Day {failedDay}</strong>
        </div>
      )}
    </div>
  );
}

function FailureSummarySection({ failures }) {
  return (
    <section className="report-failure-summary" aria-label="Mission summary">
      <div className="report-failure-summary__head">
        <span>Mission Summary</span>
      </div>
      {failures.length ? (
        <div className="report-failure-summary__grid">
          <div className="report-failure-summary__row report-failure-summary__row--head">
            <span>Part</span>
            <span>Failed</span>
            <span>Importance</span>
            <span>Reason</span>
          </div>
          {failures.map((failure) => (
            <div className="report-failure-summary__row" key={failure.id}>
              <span className="report-failure-summary__part">
                <strong>{failure.label}</strong>
              </span>
              <span>Day {failure.failedDay}</span>
              <strong
                className="report-failure-summary__importance"
                data-importance={failure.importance.label.toLowerCase().replace(/\s+/g, "-")}
              >
                {failure.importance.label}
              </strong>
              <span className="report-failure-summary__reason" title={failure.reason}>
                {failure.reason}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p>No failures</p>
      )}
    </section>
  );
}

function ReportSection({ section, series }) {
  if (section.parent) {
    return (
      <section className="report-section">
        <div className="report-section__head">
          <span>{section.label}</span>
          <strong>Subsystem</strong>
        </div>
        <ComponentTrendCard item={section.parent} series={series} />
        <div className="report-section__children">
          {section.children.map((item) => (
            <ComponentTrendCard key={item.id} item={item} series={series} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="report-section">
      <div className="report-section__head">
        <span>{section.label}</span>
        <strong>Standalone</strong>
      </div>
      <div className="report-section__standalone">
        {section.items.map((item) => (
          <ComponentTrendCard key={item.id} item={item} series={series} />
        ))}
      </div>
    </section>
  );
}

function SimulationReportPanel({ report, onClose }) {
  const finalSnapshot = report.series[report.series.length - 1]?.snapshot ?? DEFAULT_HEALTH_SNAPSHOT;
  const finalHealth = clampHealthUnit(finalSnapshot.vehicle_health ?? 1);
  const failures = buildFailureSummary(report.series, report.inputs, report.durationDays);
  const reportStatusTitle = missionStatusLabel(failures.length);

  return (
    <aside className="report-panel" aria-label="Simulation report">
      <h2 className="report-panel__document-title">Contingency Report</h2>
      <div className="report-panel__head">
        <div className="report-panel__title-stack">
          <div
            className="report-panel__title"
            data-status={failures.length ? "failed" : "passed"}
          >
            {reportStatusTitle}
          </div>
        </div>
        <div className="report-panel__actions">
          <div className="report-panel__score" style={healthColorStyle(finalHealth)}>
            <span>Overall</span>
            <strong>{formatHealthPercent(finalHealth)}</strong>
          </div>
          <button
            type="button"
            className="report-panel__download"
            onClick={() => downloadReportPdf(report)}
            aria-label="Download simulation report PDF"
            title="Download PDF"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v11" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </button>
          <button
            type="button"
            className="report-panel__close"
            onClick={onClose}
            aria-label="Close simulation report"
            title="Close report"
          >
            x
          </button>
        </div>
      </div>

      <div className="report-panel__meta">
        <span>{report.unitLabel}</span>
        <span>{report.durationDays} days</span>
        <span>{report.material}</span>
      </div>

      <div className="report-panel__sections">
        <FailureSummarySection failures={failures} />
        <ComponentTrendCard item={REPORT_HEALTH_ITEMS[0]} series={report.series} />
        {REPORT_HEALTH_SECTIONS.map((section) => (
          <ReportSection key={section.id} section={section} series={report.series} />
        ))}
      </div>
    </aside>
  );
}

function DiagnosticsHoverCard({ diagnostics, snapshot, subsystem }) {
  const factors = diagnostics?.factors ?? [];

  return (
    <div className="health-diagnostics" role="tooltip">
      <div className="health-diagnostics__head">
        <span>Applied daily change</span>
        <strong>{formatAppliedIntegrityChange(diagnostics?.dx_dt ?? 0)}</strong>
      </div>
      {factors.length ? (
        <div className="health-diagnostics__factors">
          <div className="health-diagnostics__factors-title">
            <span>Active drivers</span>
            <strong>{factors.length} {factors.length === 1 ? "driver" : "drivers"}</strong>
          </div>
          {factors.map((factor) => {
            const detail = describeDiagnosticFactor(factor, subsystem, snapshot);
            return (
              <div className="health-diagnostics__factor" key={factor.id}>
                <div className="health-diagnostics__factor-top">
                  <span>{factor.label}</span>
                  <strong>{formatAppliedFactorChange(factor.dx_dt)}</strong>
                </div>
                <div className="health-diagnostics__factor-grid">
                  <span>Input</span>
                  <strong>{detail.input}</strong>
                  <span>Formula</span>
                  <strong>{detail.formula}</strong>
                  <span>Mechanism</span>
                  <strong>{detail.mechanism}</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="health-diagnostics__empty">
          No active environmental factor is subtracting integrity from this component.
        </p>
      )}
    </div>
  );
}

function VehicleHealthPanel({ snapshot, diagnostics }) {
  const [activeDiagnostics, setActiveDiagnostics] = useState(null);
  const subsystems = snapshot?.subsystems ?? DEFAULT_HEALTH_SNAPSHOT.subsystems;
  const getSubsystemHealth = (subsystem) => (
    clampHealthUnit(subsystems[subsystem] ?? snapshot?.vehicle_health ?? 1)
  );
  const getSubsystemDiagnostics = (subsystem) => (
    diagnostics?.subsystems?.[subsystem] ?? DEFAULT_DIAGNOSTICS.subsystems[subsystem]
  );
  const showDiagnostics = (event, label, subsystem, subsystemDiagnostics) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelRect =
      event.currentTarget.closest(".health-panel")?.getBoundingClientRect() ?? rect;
    const viewportPadding = 16;
    const panelGap = 16;
    const preferredPopupWidth = 430;
    const minimumPopupWidth = 240;
    const availableLeftWidth = panelRect.left - panelGap - viewportPadding;

    if (availableLeftWidth < minimumPopupWidth) {
      setActiveDiagnostics(null);
      return;
    }

    const popupWidth = Math.min(preferredPopupWidth, availableLeftWidth);
    const left = Math.max(viewportPadding, panelRect.left - panelGap - popupWidth);
    const top = Math.max(80, Math.min(window.innerHeight - 80, rect.top + rect.height / 2));

    setActiveDiagnostics({
      label,
      subsystem,
      diagnostics: subsystemDiagnostics,
      width: popupWidth,
      top,
      left,
    });
  };
  const hideDiagnostics = () => setActiveDiagnostics(null);
  const renderHealthRow = (label, subsystem, className = "health-row") => {
    const health = getSubsystemHealth(subsystem);
    const healthPercent = health * 100;
    const subsystemDiagnostics = getSubsystemDiagnostics(subsystem);

    return (
      <div
        className={className}
        key={label}
        style={healthColorStyle(health)}
        tabIndex={0}
        onMouseEnter={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onMouseMove={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onMouseLeave={hideDiagnostics}
        onFocus={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onBlur={hideDiagnostics}
      >
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
  const renderHealthChild = (label, subsystem) => {
    const health = getSubsystemHealth(subsystem);
    const healthPercent = health * 100;
    const subsystemDiagnostics = getSubsystemDiagnostics(subsystem);

    return (
      <div
        className="health-child-row"
        key={label}
        style={healthColorStyle(health)}
        tabIndex={0}
        onMouseEnter={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onMouseMove={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onMouseLeave={hideDiagnostics}
        onFocus={(event) => showDiagnostics(event, label, subsystem, subsystemDiagnostics)}
        onBlur={hideDiagnostics}
      >
        <span className="health-child-row__label">{label}</span>
        <div className="health-child-row__meter" aria-hidden="true">
          <span style={{ "--health": `${healthPercent}%` }} />
        </div>
        <strong>{formatHealthPercent(health)}</strong>
      </div>
    );
  };

  const overallHealth = clampHealthUnit(snapshot?.vehicle_health ?? 1);

  return (
    <>
      <aside className="health-panel" aria-label="Vehicle health">
        <div className="health-panel__overall" style={healthColorStyle(overallHealth)}>
          <div className="health-panel__overall-top">
            <span>Overall Vehicle Integrity</span>
            <strong>{formatHealthPercent(overallHealth)}</strong>
          </div>
          <div className="health-panel__overall-meter" aria-hidden="true">
            <span style={{ "--health": `${overallHealth * 100}%` }} />
          </div>
        </div>

        <div className="health-panel__list" onScroll={hideDiagnostics}>
          {VEHICLE_HEALTH_GROUPS.map((group) => (
            <div className="health-group" key={group.label}>
              {renderHealthRow(group.label, group.subsystem, "health-row health-row--parent")}
              {group.children && (
                <div className="health-group__children">
                  {group.children.map((system) =>
                    renderHealthChild(system, group.subsystem),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
      {activeDiagnostics && typeof document !== "undefined" && createPortal(
        <div
          className="health-diagnostics-popover"
          style={{
            "--diagnostics-left": `${activeDiagnostics.left}px`,
            "--diagnostics-top": `${activeDiagnostics.top}px`,
            "--diagnostics-width": `${activeDiagnostics.width}px`,
          }}
        >
          <div className="health-diagnostics-popover__label">
            {activeDiagnostics.label}
          </div>
          <DiagnosticsHoverCard
            diagnostics={activeDiagnostics.diagnostics}
            snapshot={snapshot}
            subsystem={activeDiagnostics.subsystem}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function SimulationCalendarPanel({ currentDay, durationDays, startDate }) {
  const dayOffset = Math.max(0, Math.min(durationDays, Math.round(currentDay)));
  const timelineProgress = durationDays > 0
    ? Math.max(0, Math.min(1, currentDay / durationDays))
    : 0;
  const activeDate = useMemo(
    () => addCalendarDays(startDate, dayOffset),
    [dayOffset, startDate],
  );
  const calendarDays = useMemo(
    () => buildCalendarMonth(activeDate, startDate, durationDays),
    [activeDate, durationDays, startDate],
  );
  const activeDateKey = calendarDateKey(activeDate);

  return (
    <aside className="simulation-calendar-panel" aria-label="Simulation calendar">
      <div className="simulation-calendar__head">
        <div>
          <span>Simulation Calendar</span>
          <strong>{CALENDAR_MONTH_FORMATTER.format(activeDate)}</strong>
        </div>
        <div className="simulation-calendar__today">
          <span>Day {dayOffset}</span>
          <strong>{CALENDAR_DATE_FORMATTER.format(activeDate)}</strong>
        </div>
      </div>

      <div className="simulation-calendar__weekdays" aria-hidden="true">
        {CALENDAR_WEEKDAYS.map((dayName) => (
          <span key={dayName}>{dayName}</span>
        ))}
      </div>

      <div className="simulation-calendar__grid">
        {calendarDays.map((day) => {
          const isActive = day.key === activeDateKey;
          return (
            <div
              className="simulation-calendar__day"
              key={day.key}
              data-active={isActive}
              data-outside={!day.inMonth}
              data-range={day.inSimulationRange}
              aria-current={isActive ? "date" : undefined}
              title={CALENDAR_DATE_FORMATTER.format(day.date)}
            >
              <span>{day.date.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div
        className="simulation-calendar__timeline"
        style={{ "--timeline-progress": timelineProgress }}
        aria-label="Simulation timeline"
      >
        <div
          className="timeline-dock__progress"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={durationDays}
          aria-valuenow={dayOffset}
        >
          <div className="timeline-dock__fill" />
        </div>
        <div className="timeline-dock__scale">
          <span>Day 0</span>
          <span>Day {durationDays}</span>
        </div>
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
  const [isSimulationPaused, setIsSimulationPaused] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [vehicleHealthSnapshot, setVehicleHealthSnapshot] = useState(DEFAULT_HEALTH_SNAPSHOT);
  const [vehicleDiagnostics, setVehicleDiagnostics] = useState(DEFAULT_DIAGNOSTICS);
  const [simulationReport, setSimulationReport] = useState(null);
  const [simulationStartDate, setSimulationStartDate] = useState(() => (
    startOfCalendarDay(new Date())
  ));
  const physicsEngineRef = useRef(null);
  const simulationInputsRef = useRef(null);
  const isSimulationPausedRef = useRef(false);
  const reportHistoryRef = useRef([]);
  const lastReportSampleDayRef = useRef(0);
  const theaterIdForSim = theater && theater.id !== "custom" ? theater.id : "arctic";
  const [environmentParams, setEnvironmentParams] = useState(() =>
    buildEnvironmentDefaults(theaterIdForSim),
  );

  useEffect(() => {
    setEnvironmentParams(buildEnvironmentDefaults(theaterIdForSim));
    setIsSimulationActive(false);
    setIsSimulationPaused(false);
    isSimulationPausedRef.current = false;
    setCurrentDay(0);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setVehicleDiagnostics(DEFAULT_DIAGNOSTICS);
    setSimulationReport(null);
    setSimulationStartDate(startOfCalendarDay(new Date()));
    reportHistoryRef.current = [];
    lastReportSampleDayRef.current = 0;
  }, [theaterIdForSim]);

  useEffect(() => {
    isSimulationPausedRef.current = isSimulationPaused;
  }, [isSimulationPaused]);

  useEffect(() => {
    let disposed = false;

    ensurePhysicsEngineRuntime()
      .then(() => {
        if (disposed) return;
        const engine = physicsEngineRef.current ?? new PhysicsEngine();
        physicsEngineRef.current = engine;
        setVehicleHealthSnapshot(parsePhysicsSnapshot(engine.get_vehicle()));
        setVehicleDiagnostics(parsePhysicsDiagnostics(engine.get_diagnostics?.()));
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

  useEffect(() => {
    if (!simulationReport) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSimulationReport(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [simulationReport]);

  const simulationDurationDays = parseDurationDays(environmentParams.durationDays);
  const simulationDayStepDaysPerSecond = parseDayStepDaysPerSecond(
    environmentParams.dayStepDaysPerSecond,
  );
  const simulationRunDurationMs = estimatedRunDurationMs(
    simulationDurationDays,
    simulationDayStepDaysPerSecond,
  );
  const simulationRunDurationLabel = formatEstimatedRunDuration(simulationRunDurationMs);

  useEffect(() => {
    if (!isSimulationActive) return undefined;

    let elapsedMs = 0;
    let lastFrameAt = performance.now();
    let lastPhysicsDay = 0;
    let latestSnapshotForRun =
      reportHistoryRef.current[reportHistoryRef.current.length - 1]?.snapshot ??
      DEFAULT_HEALTH_SNAPSHOT;
    let raf = 0;
    const physicsEnvironment = buildPhysicsEnvironment(
      simulationInputsRef.current ?? environmentParams,
    );
    const reportSampleSpacingDays = Math.max(0.05, simulationDurationDays / (REPORT_MAX_POINTS - 1));
    const recordReportPoint = (day, snapshot, force = false) => {
      if (!snapshot) return;

      const history = reportHistoryRef.current;
      const shouldRecord =
        force || history.length === 0 || day - lastReportSampleDayRef.current >= reportSampleSpacingDays;

      if (!shouldRecord) return;

      const point = { day, snapshot };
      if (force && history.length > 0 && Math.abs(history[history.length - 1].day - day) < 0.001) {
        history[history.length - 1] = point;
      } else {
        history.push(point);
      }
      lastReportSampleDayRef.current = day;
    };

    const tick = (now) => {
      const frameDeltaMs = Math.max(0, now - lastFrameAt);
      lastFrameAt = now;

      if (isSimulationPausedRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      elapsedMs += frameDeltaMs;
      const progress = Math.min(1, elapsedMs / simulationRunDurationMs);
      const simulatedDay = simulationDurationDays * progress;
      const targetPhysicsDay = progress >= 1
        ? simulationDurationDays
        : Math.floor(simulatedDay);
      let didUpdatePhysics = false;

      setCurrentDay(simulatedDay);

      const physicsEngine = physicsEngineRef.current;
      if (physicsEngine && targetPhysicsDay > lastPhysicsDay) {
        try {
          while (lastPhysicsDay < targetPhysicsDay) {
            const nextPhysicsDay = lastPhysicsDay + 1;
            physicsEngine.set_time_step(PHYSICS_DEGRADATION_SCALE);
            latestSnapshotForRun = parsePhysicsSnapshot(
              physicsEngine.tick(
                physicsEnvironment.temperatureC,
                physicsEnvironment.particulateConcentration,
                physicsEnvironment.relativeHumidity,
                physicsEnvironment.salinityConcentration,
                physicsEnvironment.irradiance,
              ),
            );
            lastPhysicsDay = nextPhysicsDay;
            didUpdatePhysics = true;
            recordReportPoint(
              lastPhysicsDay,
              latestSnapshotForRun,
              progress >= 1 && lastPhysicsDay >= simulationDurationDays,
            );
          }
        } catch (error) {
          console.error("Unable to tick physics engine", error);
        }
      }

      if (didUpdatePhysics) {
        setVehicleHealthSnapshot(latestSnapshotForRun);
        setVehicleDiagnostics(parsePhysicsDiagnostics(physicsEngine.get_diagnostics?.()));
      }

      if (progress >= 1) {
        recordReportPoint(simulationDurationDays, latestSnapshotForRun, true);
        const finalSeries = reportHistoryRef.current.length > 0
          ? [...reportHistoryRef.current]
          : [{ day: 0, snapshot: latestSnapshotForRun }];
        const runInputs = simulationInputsRef.current ?? environmentParams;
        const unitLabel = VEHICLE_UNIT_OPTIONS.find((unit) => unit.id === vehicleId)?.label ?? "Unit";

        setSimulationReport({
          theaterLabel: theater.label,
          unitLabel,
          durationDays: simulationDurationDays,
          material: runInputs.material,
          inputs: runInputs,
          series: finalSeries,
        });
        setIsSimulationActive(false);
        setIsSimulationPaused(false);
        isSimulationPausedRef.current = false;
        return;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isSimulationActive, simulationDurationDays, simulationRunDurationMs]);

  const setEnvironmentField = (fieldId, value) => {
    setEnvironmentParams((current) => ({ ...current, [fieldId]: value }));
  };
  const resetEnvironment = () => {
    setEnvironmentParams(buildEnvironmentDefaults(theaterIdForSim));
  };
  const setDurationDays = (value) => {
    const durationValue = value.replace(/\D/g, "");
    setEnvironmentParams((current) => {
      if (!durationValue) {
        return { ...current, durationDays: durationValue };
      }
      const durationDays = parseDurationDays(durationValue);
      return {
        ...current,
        durationDays: durationValue,
        dayStepDaysPerSecond: dayStepForTargetRunDuration(durationDays),
      };
    });
  };
  const normalizeDurationDays = () => {
    setEnvironmentParams((current) => {
      const durationDays = parseDurationDays(current.durationDays);
      return {
        ...current,
        durationDays: String(durationDays),
        dayStepDaysPerSecond: dayStepForTargetRunDuration(durationDays),
      };
    });
  };
  const adjustDurationDays = (delta) => {
    setEnvironmentParams((current) => {
      const currentDays = parseDurationDays(current.durationDays);
      const durationDays = Math.max(1, currentDays + delta);
      return {
        ...current,
        durationDays: String(durationDays),
        dayStepDaysPerSecond: dayStepForTargetRunDuration(durationDays),
      };
    });
  };
  const setDayStepDaysPerSecond = (value) => {
    setEnvironmentField("dayStepDaysPerSecond", sanitizePositiveDecimalInput(value));
  };
  const normalizeDayStepDaysPerSecond = () => {
    setEnvironmentParams((current) => {
      const parsed = parseDayStepDaysPerSecond(current.dayStepDaysPerSecond);
      return { ...current, dayStepDaysPerSecond: formatDayStepDaysPerSecond(parsed) };
    });
  };
  const runSimulation = async () => {
    const durationDays = parseDurationDays(environmentParams.durationDays);
    const dayStepDaysPerSecond = parseDayStepDaysPerSecond(
      environmentParams.dayStepDaysPerSecond,
    );
    const normalizedParams = {
      ...environmentParams,
      durationDays: String(durationDays),
      dayStepDaysPerSecond: formatDayStepDaysPerSecond(dayStepDaysPerSecond),
    };
    simulationInputsRef.current = normalizedParams;
    reportHistoryRef.current = [{ day: 0, snapshot: DEFAULT_HEALTH_SNAPSHOT }];
    lastReportSampleDayRef.current = 0;

    setEnvironmentParams(normalizedParams);
    setCurrentDay(0);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setVehicleDiagnostics(DEFAULT_DIAGNOSTICS);
    setSimulationReport(null);
    setIsSimulationPaused(false);
    isSimulationPausedRef.current = false;
    setSimulationStartDate(startOfCalendarDay(new Date()));

    try {
      await ensurePhysicsEngineRuntime();
      const physicsEngine = physicsEngineRef.current ?? new PhysicsEngine();
      physicsEngineRef.current = physicsEngine;
      const materialKey =
        MATERIAL_ENGINE_KEYS[normalizedParams.material] ?? normalizedParams.material;
      if (!physicsEngine.set_material(materialKey)) {
        physicsEngine.reset();
      }
      const initialSnapshot = parsePhysicsSnapshot(physicsEngine.get_vehicle());
      reportHistoryRef.current = [{ day: 0, snapshot: initialSnapshot }];
      setVehicleHealthSnapshot(initialSnapshot);
      setVehicleDiagnostics(parsePhysicsDiagnostics(physicsEngine.get_diagnostics?.()));
    } catch (error) {
      console.error("Unable to start physics engine run", error);
    }

    setIsSimulationActive(true);
    setRunToken((token) => token + 1);
  };
  const toggleSimulationPause = () => {
    setIsSimulationPaused((current) => {
      const nextPaused = !current;
      isSimulationPausedRef.current = nextPaused;
      return nextPaused;
    });
  };
  const stopSimulation = () => {
    setIsSimulationActive(false);
    setIsSimulationPaused(false);
    isSimulationPausedRef.current = false;
    setCurrentDay(0);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setVehicleDiagnostics(DEFAULT_DIAGNOSTICS);
    setSimulationReport(null);
    setSimulationStartDate(startOfCalendarDay(new Date()));
    reportHistoryRef.current = [];
    lastReportSampleDayRef.current = 0;
  };
  const selectVehicleUnit = (nextVehicleId) => {
    setVehicleId(nextVehicleId);
    setIsSimulationPaused(false);
    isSimulationPausedRef.current = false;
    setCurrentDay(0);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setVehicleDiagnostics(DEFAULT_DIAGNOSTICS);
    setSimulationReport(null);
    setSimulationStartDate(startOfCalendarDay(new Date()));
    reportHistoryRef.current = [];
    lastReportSampleDayRef.current = 0;
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
          simulationActive={isSimulationActive && !isSimulationPaused}
          healthSnapshot={vehicleHealthSnapshot}
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

      {!isSimulationActive && !simulationReport && (
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

      {isSimulationActive && (
        <div className="run-sim-dock run-sim-dock--controls">
          <button
            type="button"
            className="run-sim-button run-sim-button--pause"
            onClick={toggleSimulationPause}
          >
            <span>{isSimulationPaused ? "Resume" : "Pause"}</span>
          </button>
          <button
            type="button"
            className="run-sim-button run-sim-button--stop"
            onClick={stopSimulation}
          >
            <span>Stop</span>
          </button>
        </div>
      )}

      {!isSimulationActive && !simulationReport && (
        <aside className="env-panel" aria-label="Input panel">
          <div className="env-panel__head">
            <div className="env-panel__title-stack">
              <div className="env-panel__title">Input Panel</div>
            </div>
            <button type="button" className="env-panel__reset" onClick={resetEnvironment}>
              Default
            </button>
          </div>
          <div className="env-panel__body">
            <section className="env-panel__section" aria-labelledby="vehicle-inputs-title">
              <div className="env-panel__section-title" id="vehicle-inputs-title">
                Vehicle Inputs
              </div>
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
            </section>

            <section
              className="env-panel__section"
              aria-labelledby="environmental-conditions-title"
            >
              <div className="env-panel__section-title" id="environmental-conditions-title">
                Environmental Conditions
              </div>
              {ENVIRONMENT_FIELDS.map((field) => (
                <EnvironmentSlider
                  key={field.id}
                  field={field}
                  value={environmentParams[field.id]}
                  onChange={(value) => setEnvironmentField(field.id, value)}
                />
              ))}
            </section>

            <section
              className="env-panel__section env-panel__section--simulation"
              aria-labelledby="simulation-inputs-title"
            >
              <div className="env-panel__section-title" id="simulation-inputs-title">
                Simulation Inputs
              </div>
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

              <label className="env-duration env-day-step">
                <div className="env-duration__top">
                  <span>Day step</span>
                  <span>Default 6</span>
                </div>
                <div className="env-duration__control env-duration__control--single">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={environmentParams.dayStepDaysPerSecond}
                    onChange={(event) => setDayStepDaysPerSecond(event.target.value)}
                    onBlur={normalizeDayStepDaysPerSecond}
                  />
                  <span>days/sec</span>
                </div>
              </label>

              <div className="simulation-estimate" aria-live="polite">
                <span>Estimated simulation duration</span>
                <strong>{simulationRunDurationLabel}</strong>
              </div>
            </section>
          </div>
        </aside>
      )}

      {!isSimulationActive && simulationReport && (
        <SimulationReportPanel
          report={simulationReport}
          onClose={() => setSimulationReport(null)}
        />
      )}

      {isSimulationActive && (
        <VehicleHealthPanel
          snapshot={vehicleHealthSnapshot}
          diagnostics={vehicleDiagnostics}
        />
      )}

      {isSimulationActive && (
        <SimulationCalendarPanel
          currentDay={currentDay}
          durationDays={simulationDurationDays}
          startDate={simulationStartDate}
        />
      )}
    </div>
  );
}
