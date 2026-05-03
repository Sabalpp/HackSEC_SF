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
const REPORT_MAX_POINTS = 120;
const REPORT_CHART_WIDTH = 180;
const REPORT_CHART_HEIGHT = 48;
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;

let physicsEngineInitPromise = null;

const VEHICLE_UNIT_OPTIONS = [
  { id: "ugv", label: "Unarmed Tank" },
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

const toHealthItemId = (label) => (
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
);

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

const healthValueForItem = (snapshot, item) => {
  if (item.overall) return clampHealthUnit(snapshot?.vehicle_health ?? 1);
  return clampHealthUnit(snapshot?.subsystems?.[item.subsystem] ?? snapshot?.vehicle_health ?? 1);
};

const buildTrendPoints = (series, item) => {
  if (!series.length) return "";
  const minDay = series[0].day;
  const maxDay = series[series.length - 1].day;
  const daySpan = Math.max(1, maxDay - minDay);

  return series
    .map((point, index) => {
      const x = ((point.day - minDay) / daySpan) * REPORT_CHART_WIDTH;
      const y = (1 - healthValueForItem(point.snapshot, item)) * REPORT_CHART_HEIGHT;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const buildReportPdf = (report) => {
  const finalSnapshot = report.series[report.series.length - 1]?.snapshot ?? DEFAULT_HEALTH_SNAPSHOT;
  const finalHealth = clampHealthUnit(finalSnapshot.vehicle_health ?? 1);
  const content = [];
  const margin = 36;
  const columnGap = 18;
  const columnWidth = (PDF_PAGE_WIDTH - margin * 2 - columnGap) / 2;
  const cardHeight = 42;
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
    const startHealth = healthValueForItem(report.series[0]?.snapshot, item);
    const endHealth = healthValueForItem(finalSnapshot, item);
    const loss = Math.max(0, startHealth - endHealth);
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
    if (item.parentLabel) {
      text(truncatePdfText(item.parentLabel, 15), x + 12, y + 22, 6.2, "0.34 0.45 0.60");
    }
    text(formatHealthPercent(endHealth), x + 12, y + 12, 10, healthRgb);
    progressBar(x + 48, y + 8, 34, 4, endHealth, healthRgb);

    line(chartX, chartY, chartX + chartWidth, chartY, "0.86 0.90 0.95", 0.45);
    line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight, "0.86 0.90 0.95", 0.45);

    const path = report.series.map((point, pointIndex) => {
      const health = healthValueForItem(point.snapshot, item);
      const pointX = chartX + ((point.day - minDay) / daySpan) * chartWidth;
      const pointY = chartY + health * chartHeight;
      return `${pdfNumber(pointX)} ${pdfNumber(pointY)} ${pointIndex === 0 ? "m" : "l"}`;
    }).join(" ");
    setStroke(healthRgb);
    content.push(`1.35 w ${path} S`);
    text(`-${Math.round(loss * 100)} pts`, chartX, y + 6, 6.2, "0.38 0.45 0.56");

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

  filledRect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, "0.96 0.98 1.00");
  filledRect(0, 696, PDF_PAGE_WIDTH, 96, "0.05 0.09 0.16");
  filledRect(0, 696, PDF_PAGE_WIDTH, 5, pdfRgbForHealth(finalHealth));
  text("LANDFORGE", margin, 762, 10, "0.58 0.76 0.96");
  text("Simulation Report", margin, 738, 24, "0.96 0.98 1.00");
  text(truncatePdfText(report.theaterLabel, 38), margin, 718, 12, "0.75 0.84 0.94");

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

  text("Component Health Trends", margin, 568, 12, "0.08 0.13 0.22");
  text("Green is healthy; red indicates severe degradation.", margin, 554, 8, "0.42 0.50 0.62");

  const chassisSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "chassis");
  const sensorsSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "sensors");
  const powerSection = REPORT_HEALTH_SECTIONS.find((section) => section.id === "power-actuation");
  drawPdfSection(chassisSection, margin, 536, columnWidth);
  const sensorsBottom = drawPdfSection(sensorsSection, margin + columnWidth + columnGap, 536, columnWidth);
  drawPdfSection(powerSection, margin + columnWidth + columnGap, sensorsBottom - 14, columnWidth);

  const stream = content.join("\n");
  const objects = [null, null, null, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const contentObjectId = objects.length;
  objects.push(`<< /Length ${stream.length + 1} >>\nstream\n${stream}\nendstream`);
  const pageObjectId = objects.length;
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectId} 0 R] /Count 1 >>`;

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
  const startHealth = healthValueForItem(series[0]?.snapshot, item);
  const endHealth = healthValueForItem(series[series.length - 1]?.snapshot, item);
  const loss = Math.max(0, startHealth - endHealth);
  const trendPath = buildTrendPoints(series, item);

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
      {item.parentLabel && <div className="report-card__group">{item.parentLabel}</div>}
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
        <path d={trendPath} />
      </svg>
      <div className="report-card__delta">
        <span>Start {formatHealthPercent(startHealth)}</span>
        <span>-{Math.round(loss * 100)} pts</span>
      </div>
    </div>
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

  return (
    <aside className="report-panel" aria-label="Simulation report">
      <div className="report-panel__head">
        <div className="report-panel__title-stack">
          <div className="report-panel__eyebrow">Simulation Report</div>
          <div className="report-panel__title">{report.theaterLabel}</div>
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
        <ComponentTrendCard item={REPORT_HEALTH_ITEMS[0]} series={report.series} />
        {REPORT_HEALTH_SECTIONS.map((section) => (
          <ReportSection key={section.id} section={section} series={report.series} />
        ))}
      </div>
    </aside>
  );
}

function VehicleHealthPanel({ snapshot, currentDay = 1 }) {
  const subsystems = snapshot?.subsystems ?? DEFAULT_HEALTH_SNAPSHOT.subsystems;
  const getSubsystemHealth = (subsystem) => (
    clampHealthUnit(subsystems[subsystem] ?? snapshot?.vehicle_health ?? 1)
  );
  const renderHealthRow = (label, subsystem, className = "health-row") => {
    const health = getSubsystemHealth(subsystem);
    const healthPercent = health * 100;

    return (
      <div className={className} key={label} style={healthColorStyle(health)}>
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

    return (
      <div className="health-child-row" key={label} style={healthColorStyle(health)}>
        <span className="health-child-row__label" title={label}>{label}</span>
        <div className="health-child-row__meter" aria-hidden="true">
          <span style={{ "--health": `${healthPercent}%` }} />
        </div>
        <strong>{formatHealthPercent(health)}</strong>
      </div>
    );
  };

  const overallHealth = clampHealthUnit(snapshot?.vehicle_health ?? 1);

  return (
    <aside className="health-panel" aria-label="Vehicle health">
      <div className="health-panel__overall" style={healthColorStyle(overallHealth)}>
        <div className="health-panel__overall-top">
          <span>Overall Vehicle Health</span>
          <strong>{formatHealthPercent(overallHealth)}</strong>
        </div>
        <div className="health-panel__chips" aria-label="Simulation status">
          <span className="health-panel__chip">Running</span>
          <span className="health-panel__chip">Day {Math.max(1, currentDay)}</span>
          <span className="health-panel__chip">Env Baseline</span>
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
                  renderHealthChild(system, group.subsystem),
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
  const [simulationReport, setSimulationReport] = useState(null);
  const physicsEngineRef = useRef(null);
  const simulationInputsRef = useRef(null);
  const reportHistoryRef = useRef([]);
  const lastReportSampleDayRef = useRef(1);
  const theaterIdForSim = theater && theater.id !== "custom" ? theater.id : "arctic";
  const [environmentParams, setEnvironmentParams] = useState(() =>
    buildEnvironmentDefaults(theaterIdForSim),
  );

  useEffect(() => {
    setEnvironmentParams(buildEnvironmentDefaults(theaterIdForSim));
    setIsSimulationActive(false);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setSimulationReport(null);
    reportHistoryRef.current = [];
    lastReportSampleDayRef.current = 1;
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

  useEffect(() => {
    if (!isSimulationActive) return undefined;

    const startedAt = performance.now();
    let lastSimulatedDay = 0;
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
      const progress = Math.min(1, (now - startedAt) / SIMULATION_RUN_DURATION_MS);
      const simulatedDay = simulationDurationDays * progress;
      const dayStep = Math.max(0, simulatedDay - lastSimulatedDay);
      lastSimulatedDay = simulatedDay;
      const reportDay = Math.max(1, 1 + (simulationDurationDays - 1) * progress);
      let latestSnapshot = null;

      setCurrentDay(Math.round(reportDay));

      const physicsEngine = physicsEngineRef.current;
      if (physicsEngine && dayStep > 0) {
        try {
          physicsEngine.set_time_step(dayStep * PHYSICS_DEGRADATION_SCALE);
          latestSnapshot = parsePhysicsSnapshot(
            physicsEngine.tick(
              physicsEnvironment.temperatureC,
              physicsEnvironment.particulateConcentration,
              physicsEnvironment.relativeHumidity,
              physicsEnvironment.salinityConcentration,
              physicsEnvironment.irradiance,
            ),
          );
          setVehicleHealthSnapshot(latestSnapshot);
        } catch (error) {
          console.error("Unable to tick physics engine", error);
        }
      }

      const history = reportHistoryRef.current;
      const reportSnapshot =
        latestSnapshot ?? history[history.length - 1]?.snapshot ?? DEFAULT_HEALTH_SNAPSHOT;
      recordReportPoint(reportDay, reportSnapshot, progress >= 1);

      if (progress >= 1) {
        const finalSeries = reportHistoryRef.current.length > 0
          ? [...reportHistoryRef.current]
          : [{ day: 1, snapshot: latestSnapshot ?? DEFAULT_HEALTH_SNAPSHOT }];
        const runInputs = simulationInputsRef.current ?? environmentParams;
        const unitLabel = VEHICLE_UNIT_OPTIONS.find((unit) => unit.id === vehicleId)?.label ?? "Unit";

        setSimulationReport({
          theaterLabel: theater.label,
          unitLabel,
          durationDays: simulationDurationDays,
          material: runInputs.material,
          series: finalSeries,
        });
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
    reportHistoryRef.current = [{ day: 1, snapshot: DEFAULT_HEALTH_SNAPSHOT }];
    lastReportSampleDayRef.current = 1;

    setEnvironmentParams(normalizedParams);
    setCurrentDay(1);
    setVehicleHealthSnapshot(DEFAULT_HEALTH_SNAPSHOT);
    setSimulationReport(null);

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
      reportHistoryRef.current = [{ day: 1, snapshot: initialSnapshot }];
      setVehicleHealthSnapshot(initialSnapshot);
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
    setSimulationReport(null);
    reportHistoryRef.current = [];
    lastReportSampleDayRef.current = 1;
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

      {!isSimulationActive && !simulationReport && (
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

      {!isSimulationActive && simulationReport && (
        <SimulationReportPanel
          report={simulationReport}
          onClose={() => setSimulationReport(null)}
        />
      )}

      {isSimulationActive && (
        <VehicleHealthPanel snapshot={vehicleHealthSnapshot} currentDay={currentDay} />
      )}

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
