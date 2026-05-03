import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { theaters } from "../data/theaters";
import { vehicles } from "../data/vehicles";
import { useLandForge } from "../hooks/useLandForge";
import { ConditionControls } from "./ConditionControls";
import { MetricsPanel } from "./MetricsPanel";
import { AssessmentCards } from "./AssessmentCards";
import { TheaterEnvironment } from "./TheaterEnvironment";
import { MissionTimeline } from "./MissionTimeline";
import landforgeIcon from "../assets/landforge-icon.png";

const formatCoord = (n) => `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)} deg`;

function buildCustomTheater(lat, lng) {
  return {
    id: "custom",
    label: `Custom - ${formatCoord(lat)}, ${formatCoord(lng)}`,
    shortLabel: "Custom",
    region: "Operator-defined drop point",
    lat,
    lng,
    intro: "Custom drop point -- sim runs against generic terrain priors.",
    accent: "#22c55e",
  };
}

const PANELS = [
  { id: "conditions", label: "Conditions" },
  { id: "metrics", label: "Metrics" },
  { id: "report", label: "Report" },
];

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
  const vehicle = vehicles[vehicleId];

  const theaterIdForSim = theater && theater.id !== "custom" ? theater.id : "arctic";
  const { input, output, setField } = useLandForge({
    theater: theaterIdForSim,
    vehicle: vehicleId,
  });

  const [open, setOpen] = useState({
    conditions: false,
    metrics: false,
    report: false,
  });
  const togglePanel = (id) => setOpen((p) => ({ ...p, [id]: !p[id] }));
  const toggleVehicle = () => setVehicleId((current) => (current === "ugv" ? "drone" : "ugv"));

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
        <TheaterEnvironment theaterId={theaterIdForSim} vehicleId={vehicleId} />
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
        <MissionTimeline output={output} />
        <button
          type="button"
          className="vehicle-top-toggle"
          onClick={toggleVehicle}
          title="Switch vehicle"
        >
          <span>Vehicle</span>
          <strong>{vehicle.label}</strong>
        </button>
      </header>

      <nav className="wb-rail" aria-label="Panels">
        {PANELS.map((p) => (
          <button
            key={p.id}
            className="wb-rail__button"
            data-active={open[p.id]}
            onClick={() => togglePanel(p.id)}
          >
            <span className="wb-rail__dot" />
            {p.label}
          </button>
        ))}
      </nav>

      {open.conditions && (
        <aside className="wb-panel wb-panel--left">
          <div className="wb-panel__head">
            <span>Conditions</span>
            <button className="wb-panel__close" onClick={() => togglePanel("conditions")}>x</button>
          </div>
          <div className="wb-panel__body">
            <ConditionControls input={input} setField={setField} />
          </div>
        </aside>
      )}
      {open.metrics && (
        <div className="wb-panel wb-panel--top-center">
          <MetricsPanel metrics={output.metrics} />
        </div>
      )}
      {open.report && (
        <aside className="wb-panel wb-panel--bottom-right">
          <div className="wb-panel__head">
            <span>Readiness Report</span>
            <button className="wb-panel__close" onClick={() => togglePanel("report")}>x</button>
          </div>
          <div className="wb-panel__body">
            <AssessmentCards cards={output.cards} />
          </div>
        </aside>
      )}
    </div>
  );
}
