import { VehicleScene } from "./VehicleScene";
import { HormuzDesertVehicleScene } from "./HormuzDesertVehicleScene";
import { TaiwanHumidVehicleScene } from "./TaiwanHumidVehicleScene";
import { ThompsonPassVehicleScene } from "./ThompsonPassVehicleScene";

export function TheaterEnvironment({ theaterId, vehicleId, runToken }) {
  if (theaterId === "arctic") {
    return <ThompsonPassVehicleScene vehicleId={vehicleId} runToken={runToken} />;
  }

  if (theaterId === "hormuz") {
    return <HormuzDesertVehicleScene vehicleId={vehicleId} runToken={runToken} />;
  }

  if (theaterId === "taiwan") {
    return <TaiwanHumidVehicleScene vehicleId={vehicleId} runToken={runToken} />;
  }

  return <VehicleScene vehicleId={vehicleId} />;
}
