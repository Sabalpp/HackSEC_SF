export const theaters = {
  arctic: {
    id: "arctic",
    label: "Thompson Pass",
    shortLabel: "Alaska",
    region: "Chugach Mountains, Alaska",
    lat: 61.13130296,
    lng: -145.7367325,
    intro:
      "Alpine snowpack, pass-road exposure, and steep Chugach terrain dominate autonomous mobility risk.",
    dominantStress: "thermal",
    accent: "#88d1ff",
  },
  hormuz: {
    id: "hormuz",
    label: "Hormuz Coast",
    shortLabel: "Hormuz",
    region: "Persian Gulf desert littoral",
    lat: 25.65,
    lng: 56.25,
    intro:
      "Sand traction loss, dust-loaded sensor degradation, and heat-driven battery loss compress operational windows.",
    dominantStress: "thermal",
    accent: "#ffb05a",
  },
  taiwan: {
    id: "taiwan",
    label: "Taiwan Highlands",
    shortLabel: "Taiwan",
    region: "Western Pacific contested terrain",
    lat: 23.7,
    lng: 121.0,
    intro:
      "Steep slope, dense canopy, urban canyon comms blockage, and contested RF environments drive mission risk.",
    dominantStress: "comms",
    accent: "#a78bfa",
  },
};

export const theaterList = Object.values(theaters);
