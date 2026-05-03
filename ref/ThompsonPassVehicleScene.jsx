import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addThompsonPassSnowTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/thompson_pass_snow_topo_terrain";

let defaultTankScenePreloaded = false;

export function preloadDefaultTankScene() {
  if (defaultTankScenePreloaded) return;
  defaultTankScenePreloaded = true;
  renderHeightMetersAt(0, 0);
  terrainNormalAt(0, 0);
}

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
