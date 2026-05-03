import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addTaiwanHumidTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/taiwan_humid_topo_terrain";

export function TaiwanHumidVehicleScene({ vehicleId, runToken, simulationActive, healthSnapshot }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      simulationActive={simulationActive}
      healthSnapshot={healthSnapshot}
      effectType="mist"
      addWorld={addTaiwanHumidTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
