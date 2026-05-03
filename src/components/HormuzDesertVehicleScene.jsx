import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addSamalayucaDuneFieldsTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/samalayuca_dune_fields_topo_terrain";

export function HormuzDesertVehicleScene({ vehicleId, runToken, simulationActive }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      simulationActive={simulationActive}
      effectType="dust"
      addWorld={addSamalayucaDuneFieldsTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
