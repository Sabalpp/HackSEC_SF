// Declarative condition catalog. Add fields here and they appear in the UI.
// Numeric fields render as sliders; choice fields render as radio buttons.

export const CONDITION_FIELDS = [
  { id: "surfaceFriction", label: "Surface friction", kind: "range", min: 0, max: 100, step: 1, unit: "%" },
  { id: "slope", label: "Slope", kind: "range", min: 0, max: 45, step: 1, unit: "deg" },
  { id: "clutter", label: "Urban clutter", kind: "range", min: 0, max: 100, step: 1, unit: "%" },

  { id: "visibility", label: "Visibility", kind: "range", min: 0, max: 100, step: 1, unit: "%" },
  { id: "airTemp", label: "Air temperature", kind: "range", min: -30, max: 50, step: 1, unit: "°C" },
  {
    id: "precipitation",
    label: "Precipitation",
    kind: "choice",
    options: ["none", "rain", "snow", "dust"],
  },

  {
    id: "gpsState",
    label: "GPS",
    kind: "choice",
    options: ["normal", "degraded", "denied"],
  },
  {
    id: "commsState",
    label: "Comms",
    kind: "choice",
    options: ["normal", "degraded", "denied"],
  },
  { id: "rfInterference", label: "RF interference", kind: "range", min: 0, max: 100, step: 1, unit: "%" },

  { id: "payloadKg", label: "Payload", kind: "range", min: 0, max: 60, step: 1, unit: "kg" },
];

export const CONDITION_SECTIONS = [
  {
    id: "terrain",
    title: "Terrain",
    description: "Surface, slope, and clutter pressure on mobility.",
    fields: ["surfaceFriction", "slope", "clutter"],
  },
  {
    id: "atmosphere",
    title: "Atmosphere",
    description: "Visibility, temperature, and precipitation pressure.",
    fields: ["visibility", "airTemp", "precipitation"],
  },
  {
    id: "electromagnetic",
    title: "Electromagnetic",
    description: "GPS, comms, and RF interference pressure.",
    fields: ["gpsState", "commsState", "rfInterference"],
  },
  {
    id: "mission",
    title: "Mission",
    description: "Mission load and posture.",
    fields: ["payloadKg"],
  },
];

export const CONDITION_DEFAULTS = {
  surfaceFriction: 75,
  slope: 5,
  clutter: 10,
  visibility: 90,
  airTemp: 18,
  precipitation: "none",
  gpsState: "normal",
  commsState: "normal",
  rfInterference: 5,
  payloadKg: 10,
};
