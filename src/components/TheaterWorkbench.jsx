import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { theaters } from "../data/theaters";
import { vehicles } from "../data/vehicles";
import { useLandForge } from "../hooks/useLandForge";
import { VehiclePicker } from "./VehiclePicker";
import { ConditionControls } from "./ConditionControls";
import { MetricsPanel } from "./MetricsPanel";
import { AssessmentCards } from "./AssessmentCards";

export function TheaterWorkbench() {
  const { theaterId } = useParams();
  const navigate = useNavigate();
  const theater = theaters[theaterId] ?? theaters.arctic;
  const [vehicleId, setVehicleId] = useState("ugv");
  const vehicle = vehicles[vehicleId];

  const { input, output, setField } = useLandForge({
    theater: theater.id,
    vehicle: vehicleId,
  });

  return (
    <div className="workbench">
      <header className="wb-header">
        <span className="wb-header__title">LANDFORGE</span>
        <span className="wb-header__theater">
          {theater.label} · {theater.region}
        </span>
        <div className="wb-header__spacer" />
        <button className="link-button" onClick={() => navigate("/")}>
          back to globe
        </button>
      </header>

      <main className="wb-stage">
        {/* SEAM: 3D vehicle viewport. Replace this placeholder with the
            three.js / R3F scene that renders the {vehicle.id} model on
            terrain matching {theater.id}. */}
        <div className="wb-stage__placeholder">
          <strong>{vehicle.label}</strong>
          3D vehicle viewport — drop the {vehicle.shortLabel} model here.
        </div>
      </main>

      <aside className="wb-side">
        <VehiclePicker vehicleId={vehicleId} onChange={setVehicleId} />
        <MetricsPanel metrics={output.metrics} />
        <ConditionControls input={input} setField={setField} />
      </aside>

      <footer className="wb-bottom">
        <AssessmentCards cards={output.cards} />
      </footer>
    </div>
  );
}
