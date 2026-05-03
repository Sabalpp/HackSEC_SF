import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addIranMaranjabDuneFieldsTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/iran_maranjab_dune_fields_topo_terrain";

export function HormuzDesertVehicleScene({ vehicleId, runToken, simulationActive }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      simulationActive={simulationActive}
      effectType="dust"
      addWorld={addIranMaranjabDuneFieldsTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
