import { VehicleScene } from "./VehicleScene";

const TERRAIN_PREVIEWS = {
  arctic: {
    title: "Thompson Pass Snow Topographic Terrain",
    src: "/terrains/thompson_pass_snow_topo_terrain.html",
  },
};

export function TheaterEnvironment({ theaterId, vehicleId }) {
  const terrain = TERRAIN_PREVIEWS[theaterId];

  return (
    <div className="theater-environment" data-terrain={terrain ? "true" : "false"}>
      {terrain && (
        <>
          <iframe
            className="theater-environment__terrain"
            title={terrain.title}
            src={terrain.src}
            tabIndex={-1}
          />
          <div className="theater-environment__scrim" />
        </>
      )}
      <VehicleScene vehicleId={vehicleId} terrainBacked={Boolean(terrain)} />
    </div>
  );
}
