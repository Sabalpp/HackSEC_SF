import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addIranMesrDesertTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/iran_mesr_desert_topo_terrain";

export function HormuzDesertVehicleScene({ vehicleId, runToken }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      effectType="dust"
      addWorld={addIranMesrDesertTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
