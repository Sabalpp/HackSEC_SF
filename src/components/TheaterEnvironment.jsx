import { VehicleScene } from "./VehicleScene";
import { HormuzDesertVehicleScene } from "./HormuzDesertVehicleScene";
import { TaiwanHumidVehicleScene } from "./TaiwanHumidVehicleScene";
import { ThompsonPassVehicleScene } from "./ThompsonPassVehicleScene";

export function TheaterEnvironment({ theaterId, vehicleId, runToken, simulationActive, healthSnapshot }) {
  if (theaterId === "arctic") {
    return (
      <ThompsonPassVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
        healthSnapshot={healthSnapshot}
      />
    );
  }

  if (theaterId === "hormuz") {
    return (
      <HormuzDesertVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
        healthSnapshot={healthSnapshot}
      />
    );
  }

  if (theaterId === "taiwan") {
    return (
      <TaiwanHumidVehicleScene
        vehicleId={vehicleId}
        runToken={runToken}
        simulationActive={simulationActive}
        healthSnapshot={healthSnapshot}
      />
    );
  }

  return <VehicleScene vehicleId={vehicleId} />;
}
