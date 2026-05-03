export const vehicles = {
  ugv: {
    id: "ugv",
    label: "Autonomous Wheeled Tank",
    shortLabel: "Tank",
    summary: "Wheeled autonomous armored platform with circular tires and an exposed roof machine-gun mount.",
    chassis: "wheeled",
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
