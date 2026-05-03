export const theaters = {
  arctic: {
    id: "arctic",
    label: "Thompson Pass",
    shortLabel: "Thompson Pass",
    region: "Chugach Mountains, Alaska",
    lat: 61.13130278,
    lng: -145.73673333,
    intro:
      "Alpine snowpack, pass-road exposure, and steep Chugach terrain dominate autonomous mobility risk.",
    dominantStress: "thermal",
    accent: "#88d1ff",
  },
  hormuz: {
    id: "hormuz",
    label: "Hormuz Strait",
    shortLabel: "Hormuz Strait",
    region: "Persian Gulf desert littoral",
    lat: 34.071,
    lng: 54.782,
    intro:
      "Sand traction loss, dust-loaded sensor degradation, and heat-driven battery loss compress operational windows.",
    dominantStress: "thermal",
    accent: "#ffb05a",
  },
  taiwan: {
    id: "taiwan",
    label: "Taiwan Highlands",
    shortLabel: "Taiwan Highlands",
    region: "Western Pacific contested terrain",
    lat: 24.6769,
    lng: 121.7704,
    intro:
      "Steep slope, dense canopy, urban canyon comms blockage, and contested RF environments drive mission risk.",
    dominantStress: "comms",
    accent: "#a78bfa",
  },
};

export const theaterList = Object.values(theaters);
