export const theaters = {
  arctic: {
    id: "arctic",
    label: "Arctic Corridor",
    shortLabel: "Arctic",
    region: "High-latitude land route",
    lat: 68.35,
    lng: -133.72,
    intro:
      "Cold-soak battery drain, snow traction, and limited recovery windows dominate ground-system performance.",
    dominantStress: "thermal",
    accent: "#88d1ff",
  },
  hormuz: {
    id: "hormuz",
    label: "Hormuz Coast",
    shortLabel: "Hormuz",
    region: "Persian Gulf desert littoral",
    lat: 26.0253,
    lng: 56.3314,
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
