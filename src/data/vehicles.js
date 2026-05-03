export const vehicles = {
  ugv: {
    id: "ugv",
    label: "Unarmed Autonomous Tank",
    shortLabel: "Tank",
    summary: "Tracked autonomous armored platform with a sensor station and no weapon mount.",
    chassis: "tracked",
    massKg: 180,
    payloadKg: 40,
    autonomyHours: 8,
  },
  drone: {
    id: "drone",
    label: "Autonomous Drone",
    shortLabel: "Drone",
    summary: "Small autonomous UAS for overwatch, ISR, and relay handoff.",
    chassis: "rotary",
    massKg: 6,
    payloadKg: 1.5,
    autonomyHours: 0.75,
  },
};

export const vehicleList = Object.values(vehicles);
