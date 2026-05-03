import { vehicleList } from "../data/vehicles";

export function VehiclePicker({ vehicleId, onChange }) {
  return (
    <div className="section">
      <div className="section__title">Vehicle</div>
      <div className="vehicle-picker">
        {vehicleList.map((v) => (
          <button
            key={v.id}
            className="vehicle-card"
            data-active={v.id === vehicleId}
            onClick={() => onChange(v.id)}
          >
            <span className="vehicle-card__title">{v.label}</span>
            <span className="vehicle-card__sub">{v.summary}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
