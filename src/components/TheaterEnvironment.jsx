import { VehicleScene } from "./VehicleScene";
import { ThompsonPassVehicleScene } from "./ThompsonPassVehicleScene";

export function TheaterEnvironment({ theaterId, vehicleId }) {
  if (theaterId === "arctic") {
    return <ThompsonPassVehicleScene vehicleId={vehicleId} />;
  }

  return <VehicleScene vehicleId={vehicleId} />;
}
