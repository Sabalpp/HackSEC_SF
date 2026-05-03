import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addThompsonPassSnowTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/thompson_pass_snow_topo_terrain";

export function ThompsonPassVehicleScene({ vehicleId, runToken, simulationActive }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      simulationActive={simulationActive}
      effectType="snow"
      addWorld={addThompsonPassSnowTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
