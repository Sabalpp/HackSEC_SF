import { VehicleScene } from "./VehicleScene";
import { HormuzDesertVehicleScene } from "./HormuzDesertVehicleScene";
import { TaiwanHumidVehicleScene } from "./TaiwanHumidVehicleScene";
import { ThompsonPassVehicleScene } from "./ThompsonPassVehicleScene";

export function TheaterEnvironment({ theaterId, vehicleId, runToken, simulationActive }) {
  if (theaterId === "arctic") {
    return (
      <ThompsonPassVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
      />
    );
  }

  if (theaterId === "hormuz") {
    return (
      <HormuzDesertVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
      />
    );
  }

  if (theaterId === "taiwan") {
    return (
      <TaiwanHumidVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
      />
    );
  }

  return <VehicleScene vehicleId={vehicleId} />;
}
