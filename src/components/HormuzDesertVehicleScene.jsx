import { MappedTerrainVehicleScene } from "./MappedTerrainVehicleScene";
import {
  addSamalayucaDuneFieldsTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/samalayuca_dune_fields_topo_terrain";

export function HormuzDesertVehicleScene({ vehicleId, runToken, simulationActive, healthSnapshot }) {
  return (
    <MappedTerrainVehicleScene
      vehicleId={vehicleId}
      runToken={runToken}
      simulationActive={simulationActive}
      healthSnapshot={healthSnapshot}
      effectType="dust"
      addWorld={addSamalayucaDuneFieldsTopoWorld}
      renderHeightMetersAt={renderHeightMetersAt}
      terrainNormalAt={terrainNormalAt}
    />
  );
}
