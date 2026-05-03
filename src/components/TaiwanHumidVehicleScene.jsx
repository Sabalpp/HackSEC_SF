import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addTaiwanHumidTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/taiwan_humid_topo_terrain";

export function TaiwanHumidVehicleScene({ vehicleId, runToken }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      effectType="mist"
      addWorld={addTaiwanHumidTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
