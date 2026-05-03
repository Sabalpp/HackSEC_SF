export const materialProfiles = {
  MildSteelTemperate: {
    label: "Mild steel, temperate baseline",
    core: "carbon steel with iron matrix and moderate carbon content",
    relativeCost: "1.0x",
    weatherBehavior:
      "Lowest cost control material. It loses margin in salt, humidity, and cold because oxide growth, coating breaks, and low-temperature toughness drive chassis degradation.",
    bestUse: "Benign dry training environments where cost matters more than corrosion or cold margin.",
  },
  MildSteelColdWeather: {
    label: "mild steel, cold-weather baseline",
    core: "carbon steel with improved low-temperature toughness assumptions",
    relativeCost: "1.1x",
    weatherBehavior:
      "Better cold allowance than the temperate steel control, but the report still penalizes it for moisture and salinity because exposed steel depends heavily on coating integrity.",
    bestUse: "Cold dry terrain with low salt and limited long-duration exposure.",
  },
  HighStrengthAH36: {
    label: "AH36 high-strength steel",
    core: "microalloyed high-strength shipbuilding steel",
    relativeCost: "1.5x",
    weatherBehavior:
      "Higher strength helps structure, but AH-grade cold margin is weaker than DH/EH grades. Salt and humidity still matter unless coatings and seals stay intact.",
    bestUse: "Moderate climates where structural stiffness is needed without premium cold toughness.",
  },
  HighStrengthDH36: {
    label: "DH36 high-strength steel",
    core: "microalloyed steel with improved impact toughness",
    relativeCost: "1.7x",
    weatherBehavior:
      "More forgiving in cold than AH36 while retaining steel cost discipline. Still vulnerable to corrosion where coating damage meets salinity.",
    bestUse: "Mixed cold/wet terrain when aluminum or titanium cost is not acceptable.",
  },
  HighStrengthEH36: {
    label: "EH36 high-strength steel",
    core: "low-temperature high-strength shipbuilding steel",
    relativeCost: "1.9x",
    weatherBehavior:
      "Good cold-weather steel choice. It reduces cold-stress penalties but remains a corrosion-managed material in humid or salty theaters.",
    bestUse: "Arctic and alpine vehicle frames that still need steel repairability.",
  },
  UltraHighStrengthEH40: {
    label: "EH40 ultra-high-strength steel",
    core: "higher-strength low-temperature shipbuilding steel",
    relativeCost: "2.3x",
    weatherBehavior:
      "Best steel option in the current model for combined cold and structural demand. It costs more and still needs coating discipline.",
    bestUse: "High-load chassis, suspension, and armored bracketry in cold or high-abrasion terrain.",
  },
  Aluminum5083: {
    label: "5083 aluminum alloy",
    core: "aluminum-magnesium marine alloy",
    relativeCost: "2.1x",
    weatherBehavior:
      "Strong corrosion behavior in wet and salt exposure. It trades lower weight and corrosion resistance against heat-softening and abrasion concerns.",
    bestUse: "Humid or littoral frames, covers, mounts, and housings where mass and corrosion matter.",
  },
  Aluminum5086: {
    label: "5086 aluminum alloy",
    core: "aluminum-magnesium marine alloy with good formability",
    relativeCost: "2.2x",
    weatherBehavior:
      "Similar corrosion advantage to 5083 with useful fabrication margin. Good upgrade when humidity and salinity are driving damage.",
    bestUse: "Vehicle housings, sensor masts, brackets, and sealed equipment covers in wet terrain.",
  },
  GRPFiberglass: {
    label: "GRP fiberglass composite",
    core: "glass fiber reinforced polymer laminate",
    relativeCost: "1.6x",
    weatherBehavior:
      "Low corrosion risk, but UV, moisture ingress, and dust abrasion can attack resin, exposed fibers, and bonded joints.",
    bestUse: "Low-cost covers, fairings, and radomes with UV coating and sacrificial wear layers.",
  },
  CFRPCarbonFiber: {
    label: "CFRP carbon fiber composite",
    core: "carbon fiber reinforced epoxy or thermoplastic laminate",
    relativeCost: "4.0x-6.0x",
    weatherBehavior:
      "Excellent stiffness-to-weight, but it needs UV protection, edge sealing, impact inspection, and electrical isolation from metals in wet/salt conditions.",
    bestUse: "Airframe skins, propellers, sensor masts, and low-mass structural panels with sealed edges.",
  },
  TitaniumGrade5: {
    label: "Ti-6Al-4V Grade 5 titanium",
    core: "alpha-beta titanium alloy",
    relativeCost: "7.0x-10.0x",
    weatherBehavior:
      "Highest corrosion and heat margin in the model. Cost, machining difficulty, galling, and supply constraints keep it for critical hardware rather than whole vehicles.",
    bestUse: "Pins, fasteners, shafts, high-value brackets, wet interfaces, and thermal-stressed housings.",
  },
};

export const vehicleTechnicalBaselines = {
  drone: {
    id: "drone",
    displayName: "RQ-11B Raven",
    reportName: "RQ-11B Raven small UAS baseline",
    unitLabel: "RQ-11B Raven UAS",
    summary:
      "Hand-launched fixed-wing UAS baseline. The report treats this as a public-reference surrogate, so component placement and costs are planning estimates rather than sensitive design data.",
    components: [
      {
        id: "battery-power-pack",
        component: "Battery / Power Pack",
        currentType: "Rechargeable aircraft batteries",
        baselineMaterial: "Li-ion/Li-poly pack, BMS, sealed connector",
        price: "$300-$900",
        subsystem: "battery",
        coreCompound:
          "lithium-ion or lithium-polymer cells, polymer separator, copper/aluminum current collectors, BMS PCB, plated connector contacts",
        mechanism:
          "Cold raises internal resistance and reduces available capacity. Heat and UV accelerate electrolyte aging and polymer embrittlement. Humidity attacks connector pins and BMS coatings.",
        betterMaterial: "low-temperature qualified cells, conformal-coated BMS, fluorosilicone connector seals",
        betterCost: "$450-$1,200",
      },
      {
        id: "electric-motor",
        component: "Electric Motor",
        currentType: "Direct-drive electric motor",
        baselineMaterial: "BLDC motor, copper windings, magnets, metal housing",
        price: "$200-$800",
        subsystem: "engine",
        coreCompound: "copper windings, NdFeB magnets, bearing steel, aluminum or steel housing, insulation varnish",
        mechanism:
          "Dust increases bearing and cooling friction. Heat raises winding resistance and can demagnetize lower-grade magnets. Moisture starts corrosion at bearings and exposed solder joints.",
        betterMaterial: "sealed BLDC motor, high-temperature magnets, ceramic or stainless bearings, improved winding varnish",
        betterCost: "$350-$1,200",
      },
      {
        id: "propeller",
        component: "Propeller",
        currentType: "Lightweight pusher propeller",
        baselineMaterial: "Molded polymer, glass-filled nylon, or CFRP",
        price: "$20-$150",
        subsystem: "chassis",
        coreCompound: "polyamide or epoxy matrix with glass or carbon reinforcement",
        mechanism:
          "UV breaks down polymer chains, dust erodes leading edges, and cold reduces impact toughness. Small edge damage changes thrust balance and increases vibration.",
        betterMaterial: "CFRP or glass-filled nylon with UV-stable resin and sacrificial leading-edge film",
        betterCost: "$60-$350",
      },
      {
        id: "control-surfaces",
        component: "Control Surfaces",
        currentType: "Fixed-wing control surfaces",
        baselineMaterial: "Foam/polymer/composite surfaces, hinges, linkages",
        price: "$300-$1,500",
        subsystem: "chassis",
        coreCompound: "foam or polymer core, composite skin, adhesive bond lines, small metal hinges and linkages",
        mechanism:
          "Moisture enters hinge and bond lines, dust abrades hinge pins, and cold stiffens polymers. The damage path is loss of free motion before full structural failure.",
        betterMaterial: "sealed CFRP/aramid sandwich surfaces with corrosion-resistant hinges and low-temp lubricant",
        betterCost: "$600-$3,000",
      },
      {
        id: "autopilot-computer",
        component: "Autopilot / Computer",
        currentType: "Onboard avionics",
        baselineMaterial: "FR-4 PCB, ICs, coating, enclosure",
        price: "$1,500-$6,000",
        subsystem: "sensors",
        coreCompound: "FR-4 fiberglass/epoxy board, copper traces, silicon ICs, conformal coating, polymer or aluminum enclosure",
        mechanism:
          "Humidity and salt reduce insulation resistance, thermal cycling strains solder joints, and dust blocks heat paths. Failures show up as resets, sensor bias, or intermittent IO.",
        betterMaterial: "rugged conformal-coated PCB, sealed aluminum enclosure, thermal pads, vent membrane",
        betterCost: "$2,500-$10,000",
      },
      {
        id: "gps-receiver",
        component: "GPS Receiver",
        currentType: "Secure GPS navigation receiver",
        baselineMaterial: "Receiver PCB, antenna, coax/radome",
        price: "$1,000-$8,000",
        subsystem: "sensors",
        coreCompound: "RF PCB, ceramic patch or active antenna, coax braid, radome polymer, plated connectors",
        mechanism:
          "Water ingress changes antenna impedance, UV ages radome polymers, and thermal cycling loosens coax interfaces. The material failure creates navigation noise before outright loss.",
        betterMaterial: "sealed rugged GNSS module, low-loss PTFE coax, UV-stable radome, gasketed antenna base",
        betterCost: "$1,500-$10,000",
      },
      {
        id: "imu-sensors",
        component: "IMU / Sensors",
        currentType: "MEMS inertial sensors",
        baselineMaterial: "MEMS dies on PCB, coating, solder joints",
        price: "$300-$4,000",
        subsystem: "sensors",
        coreCompound: "silicon MEMS die, ceramic or plastic package, FR-4 PCB, solder joints, conformal coating",
        mechanism:
          "Thermal cycling creates bias drift, humidity degrades board insulation, and vibration from damaged propellers or tracks adds noise. Material damage appears as rising drift and calibration instability.",
        betterMaterial: "temperature-compensated MEMS IMU, ceramic package, conformal-coated board, vibration-isolated mount",
        betterCost: "$800-$8,000",
      },
      {
        id: "eo-camera",
        component: "EO Camera",
        currentType: "Color EO video sensor",
        baselineMaterial: "CMOS/CCD sensor, lens, window, housing",
        price: "$1,000-$8,000",
        subsystem: "sensors",
        coreCompound: "silicon image sensor, optical glass or polymer lens, coated window, aluminum or polymer housing",
        mechanism:
          "Dust scratches windows, humidity fogs optics, and heat raises sensor noise. Material failure reduces contrast and target-quality imagery before the camera fully fails.",
        betterMaterial: "sealed EO module with hydrophobic hard-coated window and desiccant or membrane vent",
        betterCost: "$1,500-$10,000",
      },
      {
        id: "ir-thermal-camera",
        component: "IR / Thermal Camera",
        currentType: "Thermal video sensor",
        baselineMaterial: "Uncooled LWIR microbolometer, IR optics",
        price: "$4,000-$25,000",
        subsystem: "sensors",
        coreCompound: "VOx or amorphous-silicon microbolometer, germanium or chalcogenide optics, sealed housing",
        mechanism:
          "Heat raises noise floor, humidity threatens sealed cavities, and dust reduces transmission through the IR window. Damage shows as poorer thermal contrast and calibration drift.",
        betterMaterial: "higher-grade uncooled core, sealed IR window, desiccant cavity, thermal isolation mount",
        betterCost: "$6,000-$35,000",
      },
      {
        id: "gimbal-stabilizer",
        component: "Gimbal / Stabilizer",
        currentType: "Multi-axis gimbaled payload",
        baselineMaterial: "Polymer/aluminum shell, motors, bearings, cabling",
        price: "$5,000-$30,000",
        subsystem: "sensors",
        coreCompound: "aluminum or polymer housing, miniature motors, bearings, flex cable, encoder magnets",
        mechanism:
          "Dust enters bearings, cold thickens lubricant, and humidity corrodes flex-cable contacts. Stabilization degrades as friction and encoder noise rise.",
        betterMaterial: "sealed magnesium or aluminum gimbal, ceramic bearings, coated flex circuits, low-temp lubricant",
        betterCost: "$8,000-$45,000",
      },
      {
        id: "communications",
        component: "Communications",
        currentType: "DDL radio",
        baselineMaterial: "RF PCB, coax, shielding, enclosure",
        price: "$5,000-$25,000",
        subsystem: "sensors",
        coreCompound: "RF laminate PCB, copper traces, shield cans, coax, plated connectors, sealed housing",
        mechanism:
          "Heat derates power electronics, humidity lowers insulation resistance, and dust blocks heat rejection. The material path is intermittent range loss and packet errors.",
        betterMaterial: "sealed RF module, conformal coating, thermal spreader, low-loss coax, gasketed enclosure",
        betterCost: "$8,000-$35,000",
      },
      {
        id: "antenna",
        component: "Antenna",
        currentType: "Small UAS RF antenna",
        baselineMaterial: "Copper/brass element, coax, radome",
        price: "$100-$1,000",
        subsystem: "sensors",
        coreCompound: "copper or brass radiator, solder joints, coax dielectric, radome polymer",
        mechanism:
          "UV and cold crack radomes, salt and humidity corrode solder joints, and vibration loosens coax. Material damage changes impedance and reduces link margin.",
        betterMaterial: "rugged patch or blade antenna, PTFE coax, UV-stable radome, sealed strain relief",
        betterCost: "$250-$2,000",
      },
      {
        id: "video-downlink",
        component: "Video Downlink",
        currentType: "Digital video/data link",
        baselineMaterial: "Radio stack plus encoder electronics",
        price: "$2,000-$15,000",
        subsystem: "sensors",
        coreCompound: "encoder ICs, RF front end, copper planes, shield cans, thermal pads",
        mechanism:
          "Thermal load increases bit errors and throttling, humidity creates leakage paths, and dust insulates heat sinks. Video quality collapses before hardware is visibly broken.",
        betterMaterial: "rugged encoder board, conformal coating, thermal pads, sealed RF enclosure",
        betterCost: "$3,000-$20,000",
      },
      {
        id: "ground-control",
        component: "Ground Control (GCS)",
        currentType: "Common GCS / video terminal",
        baselineMaterial: "Rugged electronics, LCD, controls, housing, battery",
        price: "$15,000-$60,000",
        subsystem: "sensors",
        coreCompound: "LCD stack, controller PCBs, lithium pack, elastomer keypad, rugged housing",
        mechanism:
          "Cold reduces terminal battery output, heat stresses display and pack, and dust/humidity attack controls and ports. It becomes the human-interface bottleneck.",
        betterMaterial: "fully rugged controller with sealed controls, high-brightness LCD, conformal coating, hot/cold battery kit",
        betterCost: "$20,000-$80,000",
      },
      {
        id: "launch-readiness",
        component: "Launch Readiness",
        currentType: "Hand-launched air vehicle",
        baselineMaterial: "Grip/skin material same as aircraft body",
        price: "$50-$500",
        subsystem: "chassis",
        coreCompound: "polymer skin, foam or composite shell, grip coating, local reinforcement",
        mechanism:
          "Cold and UV embrittle skin and grip materials; dust scratches high-contact areas. Damage raises the chance of skin cracks during handling.",
        betterMaterial: "reinforced grip skin, abrasion-resistant elastomer patch, sealed local composite reinforcement",
        betterCost: "$100-$1,000",
      },
      {
        id: "recovery-readiness",
        component: "Recovery Readiness",
        currentType: "Deep-stall/autoland",
        baselineMaterial: "Software/aero mode plus exposed hardware allowance",
        price: "$500-$3,000",
        subsystem: "chassis",
        coreCompound: "airframe skin, belly contact surfaces, hinges, control linkages, firmware-controlled recovery mode",
        mechanism:
          "Repeated rough recovery loads open bond lines and wear belly skins. Wet or icy surfaces raise impact variability and push damage into hinges and seams.",
        betterMaterial: "sacrificial skid strip, tougher belly laminate, sealed hinges, impact-tolerant local reinforcement",
        betterCost: "$800-$5,000",
      },
      {
        id: "connectors-seals",
        component: "Connectors & Seals",
        currentType: "Rugged field interfaces",
        baselineMaterial: "Sealed connectors, plated contacts, gaskets",
        price: "$300-$2,000",
        subsystem: "sensors",
        coreCompound: "gold or tin plated contacts, silicone or EPDM gaskets, polymer shells, potting compound",
        mechanism:
          "Humidity and salinity create corrosion and leakage paths; UV and cold harden gaskets. Many electrical failures start as connector material failures.",
        betterMaterial: "IP-rated circular connectors, gold contacts, fluorosilicone gaskets, strain-relieved overmold",
        betterCost: "$500-$4,000",
      },
      {
        id: "spares-charger",
        component: "Spares / Charger",
        currentType: "Batteries / charger",
        baselineMaterial: "Lithium packs, charger PCB, housing, protection",
        price: "$1,000-$8,000",
        subsystem: "battery",
        coreCompound: "lithium cells, charger FR-4 PCB, copper conductors, polymer housing, protection circuitry",
        mechanism:
          "Temperature extremes age packs and chargers, dust blocks vents, and humidity corrodes charging contacts. Fleet endurance drops as spare packs age unevenly.",
        betterMaterial: "smart charger, coated charger PCB, cold-weather packs, sealed charge contacts",
        betterCost: "$1,500-$12,000",
      },
    ],
  },
  ugv: {
    id: "ugv",
    displayName: "Teledyne FLIR Centaur",
    reportName: "Teledyne FLIR Centaur UGV baseline",
    unitLabel: "Centaur UGV",
    summary:
      "Medium tracked ground robot baseline. The report maps public component categories to simulated subsystem health and estimated replacement-cost exposure.",
    components: [
      {
        id: "battery-power",
        component: "Battery / Power",
        currentType: "Rechargeable robot power system",
        baselineMaterial: "Li-ion modules, BMS, cabling, rugged enclosure",
        price: "$2,000-$10,000",
        subsystem: "battery",
        coreCompound:
          "lithium-ion cell modules, BMS PCB, copper bus bars, polymer insulation, sealed enclosure, plated high-current contacts",
        mechanism:
          "Cold cuts available capacity and power. Heat accelerates cell aging. Humidity and salt attack high-current connectors and BMS boards.",
        betterMaterial: "low-temperature cell modules, coated BMS, sealed high-current connectors, insulated aluminum enclosure",
        betterCost: "$3,000-$14,000",
      },
      {
        id: "drive-motors",
        component: "Drive Motors",
        currentType: "Electric locomotion motors",
        baselineMaterial: "BLDC/geared motors, gears, magnets, metal housing",
        price: "$3,000-$15,000",
        subsystem: "engine",
        coreCompound: "copper windings, permanent magnets, steel gears, bearing steel, grease, aluminum or steel housing",
        mechanism:
          "Dust enters seals and wears gears, cold thickens grease, and heat raises winding resistance. The damage path is torque loss, current rise, and motor controller stress.",
        betterMaterial: "sealed geared BLDC units, high-temp magnets, low-temp grease, stainless or ceramic bearings",
        betterCost: "$5,000-$22,000",
      },
      {
        id: "mobility-system",
        component: "Mobility System",
        currentType: "Tracked/wheeled mobility",
        baselineMaterial: "Rubber tracks/tires, hubs, pins, bearings",
        price: "$5,000-$20,000",
        subsystem: "chassis",
        coreCompound: "rubber or elastomer track, steel pins, aluminum hubs, bearing steel, reinforcement cords",
        mechanism:
          "Sand abrades rubber and pins, ice packs track gaps, and UV ages elastomer. The failure begins as traction loss and higher drive current.",
        betterMaterial: "abrasion-resistant track compound, stainless pins, sealed bearings, replaceable grousers",
        betterCost: "$7,000-$28,000",
      },
      {
        id: "chassis-frame",
        component: "Chassis / Frame",
        currentType: "Rugged medium UGV frame",
        baselineMaterial: "Aluminum frame, covers, fasteners",
        price: "$8,000-$35,000",
        subsystem: "chassis",
        coreCompound: "aluminum alloy plate/extrusion, steel or stainless fasteners, protective coating, polymer covers",
        mechanism:
          "Salt and humidity attack fastener interfaces, dust abrades coatings, and thermal cycling opens joints. Damage shows as loosened panels and corrosion at dissimilar-metal interfaces.",
        betterMaterial: "5086/5083 aluminum, isolated stainless or titanium fasteners, hard anodize, sealed panel joints",
        betterCost: "$12,000-$50,000",
      },
      {
        id: "suspension",
        component: "Suspension",
        currentType: "Obstacle/slope hardware",
        baselineMaterial: "Arms, bogies, bearings, elastomer pads",
        price: "$4,000-$20,000",
        subsystem: "chassis",
        coreCompound: "aluminum or steel arms, bearing steel, elastomer pads, grease, fasteners",
        mechanism:
          "Dust and grit grind bearings, cold stiffens elastomers, and salt corrodes pins. That raises rolling resistance and transfers shock into the chassis.",
        betterMaterial: "sealed bearings, low-temp elastomers, stainless pins, hard-anodized arms, replaceable wear pads",
        betterCost: "$6,000-$28,000",
      },
      {
        id: "manipulator-arm",
        component: "Manipulator Arm",
        currentType: "5-DOF arm",
        baselineMaterial: "Aluminum links, gears, pins, covers, wiring",
        price: "$25,000-$100,000",
        subsystem: "hydraulics",
        coreCompound: "aluminum links, steel pins/gears, encoder magnets, cable bundles, polymer covers",
        mechanism:
          "Dust enters joints, humidity corrodes pins and connectors, and cold thickens lubricants. Position accuracy falls as backlash and current draw increase.",
        betterMaterial: "hard-anodized links, sealed harmonic or planetary joints, stainless pins, coated wiring, low-temp lubricant",
        betterCost: "$35,000-$140,000",
      },
      {
        id: "arm-actuators",
        component: "Arm Actuators",
        currentType: "Electric joint actuators",
        baselineMaterial: "Motors, gearboxes, encoders, seals",
        price: "$10,000-$50,000",
        subsystem: "hydraulics",
        coreCompound: "copper windings, steel gears, encoder PCB, elastomer seals, lubricant",
        mechanism:
          "Cold increases actuator friction, dust wears seals and gears, and heat lowers motor margin. The joint loses speed and torque before it fully stops.",
        betterMaterial: "sealed actuator modules, low-temp grease, ceramic/stainless bearings, conformal-coated encoder boards",
        betterCost: "$14,000-$70,000",
      },
      {
        id: "gripper",
        component: "Gripper",
        currentType: "Robotic gripper",
        baselineMaterial: "Metal jaws, rubber pads, sealed actuator",
        price: "$3,000-$20,000",
        subsystem: "hydraulics",
        coreCompound: "aluminum or steel jaws, rubber pads, actuator motor, gears, pins, seals",
        mechanism:
          "Dust and salt increase hinge friction, cold hardens rubber pads, and abrasion removes grip texture. The gripper loses controlled force first.",
        betterMaterial: "replaceable high-friction pads, stainless hinge pins, sealed actuator, abrasion-resistant jaw coating",
        betterCost: "$4,000-$28,000",
      },
      {
        id: "ptz-camera-suite",
        component: "PTZ Camera Suite",
        currentType: "VIS/NIR/LWIR PTZ camera",
        baselineMaterial: "Housing, glass optics, IR optics, seals",
        price: "$15,000-$80,000",
        subsystem: "sensors",
        coreCompound: "visible/NIR glass, LWIR germanium or chalcogenide optics, motors, bearings, seals, aluminum housing",
        mechanism:
          "Dust scratches windows, humidity fogs optics, and heat raises sensor noise. Pan/tilt bearings degrade when grit enters seal lines.",
        betterMaterial: "sealed PTZ housing, hard-coated optical windows, desiccant or membrane vent, sealed bearings",
        betterCost: "$20,000-$110,000",
      },
      {
        id: "eo-camera",
        component: "EO Camera",
        currentType: "Visible/NIR imaging",
        baselineMaterial: "CMOS sensor, optics, coated window",
        price: "$1,000-$15,000",
        subsystem: "sensors",
        coreCompound: "silicon image sensor, glass optics, coated cover window, PCB, housing",
        mechanism:
          "Dust and mud occlude the window, humidity drives condensation, and heat raises noise. The result is perception confidence loss.",
        betterMaterial: "sealed EO module, hydrophobic hard-coated cover, heater/defog feature, coated PCB",
        betterCost: "$2,000-$20,000",
      },
      {
        id: "ir-thermal-camera",
        component: "IR / Thermal Camera",
        currentType: "LWIR imaging",
        baselineMaterial: "Uncooled microbolometer, Ge/chalcogenide optics",
        price: "$5,000-$40,000",
        subsystem: "sensors",
        coreCompound: "VOx or amorphous-silicon microbolometer, germanium or chalcogenide optics, sealed cavity",
        mechanism:
          "High ambient temperature compresses thermal contrast, humidity threatens seals, and dust reduces transmission. The camera reports lower useful contrast.",
        betterMaterial: "rugged uncooled core, sealed IR window, thermal isolation, desiccant cavity",
        betterCost: "$7,000-$55,000",
      },
      {
        id: "optical-covers",
        component: "Optical Covers",
        currentType: "Protective windows",
        baselineMaterial: "Coated glass/polycarbonate, IR windows",
        price: "$200-$5,000",
        subsystem: "sensors",
        coreCompound: "polycarbonate or glass cover, hard coating, IR window material, gasket",
        mechanism:
          "Dust scratches coatings, UV yellows polymers, and humidity attacks edge seals. Optical damage directly lowers sensor signal-to-noise.",
        betterMaterial: "sapphire or hard-coated glass, replaceable sacrificial films, UV-stable gasket",
        betterCost: "$500-$8,000",
      },
      {
        id: "onboard-computer",
        component: "Onboard Computer",
        currentType: "Rugged compute/control",
        baselineMaterial: "ICs, FR-4 PCBs, heatsinks, enclosure",
        price: "$3,000-$25,000",
        subsystem: "sensors",
        coreCompound: "silicon ICs, FR-4 boards, copper planes, heatsinks, thermal pads, sealed enclosure",
        mechanism:
          "Heat creates throttling, dust insulates heat sinks, and humidity creates leakage paths. Damage appears as compute resets or degraded autonomy latency.",
        betterMaterial: "conformal-coated rugged compute, sealed heat-spreading enclosure, filtered or fanless thermal path",
        betterCost: "$5,000-$35,000",
      },
      {
        id: "navigation-sensors",
        component: "Navigation Sensors",
        currentType: "Robot navigation sensors",
        baselineMaterial: "MEMS IMU, encoders, sealed PCBs/wiring",
        price: "$2,000-$20,000",
        subsystem: "sensors",
        coreCompound: "silicon MEMS die, optical/magnetic encoders, FR-4 boards, cable jackets, connectors",
        mechanism:
          "Thermal cycling causes bias drift, dust reaches encoder gaps, and humidity corrodes connector pins. Navigation error rises gradually.",
        betterMaterial: "sealed encoders, temperature-compensated IMU, coated boards, shielded sealed cable harness",
        betterCost: "$3,000-$28,000",
      },
      {
        id: "obstacle-detection",
        component: "Obstacle Detection",
        currentType: "Perception sensing",
        baselineMaterial: "EO/NIR/proximity sensors, housings",
        price: "$2,000-$25,000",
        subsystem: "sensors",
        coreCompound: "optical emitters/receivers, sensor PCB, cover window, aluminum or polymer housing",
        mechanism:
          "Dust and mud lower optical return, humidity fogs covers, and heat raises electronics noise. False negatives become the first operational symptom.",
        betterMaterial: "sealed sensor modules, hydrophobic covers, self-cleaning or replaceable window film, coated PCB",
        betterCost: "$3,500-$35,000",
      },
      {
        id: "communications",
        component: "Communications",
        currentType: "Radio / optional fiber tether",
        baselineMaterial: "RF electronics, coax, fiber tether",
        price: "$5,000-$40,000",
        subsystem: "sensors",
        coreCompound: "RF PCB, copper coax, optical fiber, shield cans, connector shells, cable jackets",
        mechanism:
          "Heat derates RF electronics, humidity corrodes connector shells, and dust damages exposed cable jackets. Link margin falls before the unit fully fails.",
        betterMaterial: "sealed RF enclosure, rugged low-loss coax, armored fiber option, coated connectors",
        betterCost: "$8,000-$55,000",
      },
      {
        id: "antenna",
        component: "Antenna",
        currentType: "RF antenna",
        baselineMaterial: "Copper/brass element, coax, radome",
        price: "$200-$3,000",
        subsystem: "sensors",
        coreCompound: "copper or brass radiator, coax dielectric, solder joints, radome polymer",
        mechanism:
          "UV and heat age the radome, humidity corrodes solder joints, and vibration loosens feed points. The antenna detunes under material stress.",
        betterMaterial: "ruggedized antenna with UV-stable radome, PTFE coax, sealed feedthrough, strain relief",
        betterCost: "$500-$5,000",
      },
      {
        id: "video-data-link",
        component: "Video / Data Link",
        currentType: "Radio/fiber path",
        baselineMaterial: "Encoder PCB, RF/fiber modules, cabling",
        price: "$5,000-$35,000",
        subsystem: "sensors",
        coreCompound: "encoder silicon, RF/fiber modules, FR-4 board, copper traces, cable insulation",
        mechanism:
          "Heat and dust drive electronics throttling, while humidity attacks cable interfaces. Degradation shows as latency, artifacts, and dropouts.",
        betterMaterial: "rugged encoder module, conformal-coated PCB, sealed RF/fiber interfaces, thermal spreader",
        betterCost: "$7,000-$48,000",
      },
      {
        id: "payload-mounts",
        component: "Payload Mounts",
        currentType: "Modular interfaces",
        baselineMaterial: "Aluminum rails/brackets, connectors",
        price: "$1,000-$10,000",
        subsystem: "chassis",
        coreCompound: "aluminum rails, steel fasteners, plated electrical contacts, gasket material",
        mechanism:
          "Salt and humidity corrode mixed-metal interfaces, dust wears latch surfaces, and vibration loosens fasteners. Payload repeatability degrades.",
        betterMaterial: "hard-anodized aluminum, isolated stainless/titanium fasteners, sealed connector blocks",
        betterCost: "$1,500-$14,000",
      },
      {
        id: "cbrn-hazmat",
        component: "CBRN / HazMat",
        currentType: "Detector payload support",
        baselineMaterial: "Payload housings, membranes, tubes, filters",
        price: "$5,000-$60,000+",
        subsystem: "sensors",
        coreCompound: "polymer membranes, PTFE or silicone tubes, filters, sealed housings, sensor electronics",
        mechanism:
          "Dust loads filters, humidity alters membrane behavior, and heat changes sensor baseline. Material degradation increases false alarms and maintenance burden.",
        betterMaterial: "chemical-resistant tubing, replaceable filter stack, sealed electronics, hydrophobic membrane",
        betterCost: "$8,000-$80,000+",
      },
      {
        id: "explosive-detection",
        component: "Explosive Detection",
        currentType: "Detection support",
        baselineMaterial: "Sensor housings, nozzles, filters, connectors",
        price: "$10,000-$150,000+",
        subsystem: "sensors",
        coreCompound: "sample nozzles, polymer tubing, filters, sensor housing, sealed connectors",
        mechanism:
          "Dust clogs nozzles and filters, heat shifts calibration, and humidity changes sample transport. The material path is lower confidence and higher consumable use.",
        betterMaterial: "abrasion-resistant nozzles, replaceable filter cassette, heated/conditioned sample path, sealed connectors",
        betterCost: "$15,000-$190,000+",
      },
      {
        id: "controller-ocu",
        component: "Controller (OCU)",
        currentType: "Rugged laptop/controller",
        baselineMaterial: "Rugged shell, chassis, LCD, battery",
        price: "$10,000-$50,000",
        subsystem: "sensors",
        coreCompound: "magnesium or polymer shell, LCD stack, lithium battery, keyboard elastomers, PCBs",
        mechanism:
          "Cold reduces battery output, heat stresses display and pack, and dust/humidity attack keys and ports. Control reliability becomes the bottleneck.",
        betterMaterial: "fully rugged OCU, sealed keypad, hot/cold battery set, conformal-coated IO boards",
        betterCost: "$14,000-$70,000",
      },
      {
        id: "connectors-seals",
        component: "Connectors & Seals",
        currentType: "Rugged field interfaces",
        baselineMaterial: "Sealed connectors, gaskets, panels",
        price: "$2,000-$15,000",
        subsystem: "sensors",
        coreCompound: "plated contacts, connector shells, silicone/EPDM gaskets, panel seals, potting compounds",
        mechanism:
          "Humidity and salt drive corrosion and leakage, while UV and cold harden gaskets. Connector material failures cause many intermittent electrical symptoms.",
        betterMaterial: "IP-rated circular connectors, gold contacts, fluorosilicone gaskets, sealed panel glands",
        betterCost: "$3,000-$22,000",
      },
      {
        id: "thermal-management",
        component: "Thermal Mgmt.",
        currentType: "Electronics cooling",
        baselineMaterial: "Heatsinks, pads, fans/filters, conductors",
        price: "$500-$8,000",
        subsystem: "engine",
        coreCompound: "aluminum or copper heat sinks, silicone thermal pads, fans, filters, heat spreaders",
        mechanism:
          "Dust clogs filters and fins, heat raises electronics junction temperature, and humidity corrodes fan bearings. Thermal margin loss accelerates electronics aging.",
        betterMaterial: "fanless heat-spreading enclosure, sealed thermal path, replaceable filters, high-conductivity pads",
        betterCost: "$1,000-$12,000",
      },
    ],
  },
};

export const capabilityReplacementBaselines = {
  drone: [
    {
      id: "srr-skydio-x10d",
      name: "Skydio X10D",
      program: "Short Range Reconnaissance (SRR)",
      procurementSignal: "March 2026 Army order reported above $52M for more than 2,500 systems",
      cost: "about $20.8K per system from the cited order",
      capabilityShift:
        "VTOL rucksack-portable ISR replaces hand-launch/deep-stall fixed-wing operation. ATAK/UVC-style control reduces dependence on bespoke Raven GCS hardware.",
      materialAndSubsystemShift:
        "Weatherized quadrotor airframe, integrated high-resolution EO, Teledyne FLIR Boson+ thermal core, onboard AI visual navigation, and 360-degree navigation cameras.",
      damageRelevance:
        "The design shifts risk from fixed-wing recovery shock and proprietary payload repair toward battery thermal margin, rotor/prop abrasion, sealed camera windows, and edge-compute cooling.",
    },
    {
      id: "srr-teal-black-widow",
      name: "Teal Black Widow",
      program: "SRR Program of Record",
      procurementSignal: "Selected in November 2024 after Army evaluation activity",
      cost: "about $45K for a package described as two aircraft and one unified controller",
      capabilityShift:
        "Small VTOL UAS with modular field repair, tool-less prop replacement, visual navigation, and RF-silent operating modes.",
      materialAndSubsystemShift:
        "Carbon-filled or nylon props, Teledyne FLIR Hadron 640R+ EO/IR payload, Qualcomm RB5 edge compute, Doodle Labs Hex-Band radio, and FLIR Prism software stack.",
      damageRelevance:
        "The key material failure controls are propeller balance, battery aging, sealed EO/IR payload health, connector sealing, and compute/radio heat rejection.",
    },
    {
      id: "colvl-ghost-x",
      name: "Anduril Ghost X",
      program: "Company-Level Directed Requirement / Medium Range Reconnaissance path",
      procurementSignal: "September 2024 CoLvl DR tranche plus April 2026 Ghost-X/Trillium payload award",
      cost: "program-bundle pricing; payload integration can dominate cost",
      capabilityShift:
        "Moves beyond Raven-class reconnaissance into longer-endurance company-level ISR, relay, and multi-payload operations.",
      materialAndSubsystemShift:
        "Collapsible expeditionary single-rotor architecture, rail-centric payload modularity, Lattice software integration, and Trillium HD imaging payload options.",
      damageRelevance:
        "The replacement logic emphasizes modular payload replacement, software-defined autonomy, and endurance rather than repairing a bespoke fixed-wing SUAS stack.",
    },
    {
      id: "colvl-pdw-c100",
      name: "PDW C100",
      program: "Company-Level Directed Requirement",
      procurementSignal: "September 2024 tranche award alongside Ghost X",
      cost: "program-bundle pricing; heavy-lift payloads materially change total system cost",
      capabilityShift:
        "Man-packable heavy-lift quadcopter provides longer endurance, heavier payload carriage, relay roles, and GPS-denied navigation options.",
      materialAndSubsystemShift:
        "Foldable MIL-STD/IP54-rated airframe, Doodle Labs Mini Mesh Rider radio, third-party payload architecture, and vision-based navigation payloads.",
      damageRelevance:
        "IP-rated sealing, trackable battery aging, payload mount fatigue, radio thermal margin, and dust/water ingress become the central sustainment factors.",
    },
  ],
  ugv: [
    {
      id: "crs-i-spur",
      name: "QinetiQ SPUR",
      program: "Common Robotic System-Individual (CRS-I)",
      procurementSignal: "March 2019 Army selection with production contract potential up to thousands of robots",
      cost: "$140K-$170K estimated unit cost",
      capabilityShift:
        "Shrinks the Centaur-style ground robotics role into a backpackable sub-25 lb class for dismounted teams.",
      materialAndSubsystemShift:
        "Miniature tracked chassis, detachable manipulator arm, HD cameras, thermal camera, IOP interfaces, UC-LITE controller, and Wave Relay MANET radio.",
      damageRelevance:
        "Miniaturization makes seals, small bearings, actuator gear teeth, thermal camera windows, and cable strain relief more important than raw chassis mass.",
    },
    {
      id: "crs-h-kobra-t7",
      name: "FLIR Kobra / L3Harris T7 class",
      program: "Common Robotic System-Heavy and allied heavy EOD robotics",
      procurementSignal: "FLIR CRS-H award in 2019; Air Force T7 IDIQ in 2021",
      cost: "Kobra program unit economics vary; T7 class cited around $1.3M average unit cost",
      capabilityShift:
        "Keeps heavy EOD manipulation but increases strength, reach, haptic control, and mission reliability for high-stakes disposal work.",
      materialAndSubsystemShift:
        "Heavy track systems, large manipulator joints, haptic controllers, rugged EO/IR, high-current power, and precision sealed actuation.",
      damageRelevance:
        "The failure economics are dominated by manipulator actuators, track wear, haptic/encoder integrity, and shock-hardened camera suites.",
    },
    {
      id: "smet-inc-ii",
      name: "S-MET Increment II",
      program: "Squad Multipurpose Equipment Transport",
      procurementSignal: "September 2024 prototyping awards; production expected later in the decade",
      cost: "program dependent; payload and exportable power drive cost",
      capabilityShift:
        "Moves ground robotics from EOD-only tasks toward squad logistics, casualty evacuation support, exportable power, and drone support payloads.",
      materialAndSubsystemShift:
        "Higher-payload wheeled/tracked mobility, power generation/export, rugged automotive drive components, and modular payload interfaces.",
      damageRelevance:
        "The report should watch traction surfaces, suspension fatigue, battery/generator thermal load, connector sealing, and payload mount wear.",
    },
    {
      id: "rcv-light",
      name: "Robotic Combat Vehicle-Light",
      program: "RCV-L / unmanned ground commercial robotic vehicle path",
      procurementSignal: "August 2025 presolicitation referenced a strict per-unit affordability cap",
      cost: "$650K per-unit cap target in cited requirement",
      capabilityShift:
        "Reframes robotics as distributed scout/combat mass with cost discipline rather than bespoke high-cost vehicle development.",
      materialAndSubsystemShift:
        "COTS automotive drivetrain logic, modular sensors, radar/LIDAR options, open architecture, and payload-capable chassis.",
      damageRelevance:
        "The controlling damage path becomes automotive reliability, thermal management, dust/water ingress, sensor window protection, and modular payload survivability.",
    },
  ],
};

export const subsystemEconomics = [
  {
    id: "eo-ir",
    label: "EO/IR payloads",
    costSignal:
      "Hadron 640R+ development-kit class payloads are in the low-thousands; larger Trillium HD payloads can reach six figures depending on configuration.",
    materialPoint:
      "Silicon EO sensors, VOx or amorphous-silicon microbolometers, germanium/chalcogenide IR optics, magnesium/aluminum housings, and hard-coated windows.",
    reportMeaning:
      "Sensor health should explain window scratching, condensation, thermal noise, stabilization friction, and replacement-payload economics.",
  },
  {
    id: "manet",
    label: "MANET communications",
    costSignal:
      "Persistent Systems MPU5-class radios are roughly $10K-$11K each; two-radio setups can approach $20K before integration.",
    materialPoint:
      "RF laminate PCBs, copper coax, MIMO antennas, shield cans, rugged connector shells, thermal pads, and sealed radio housings.",
    reportMeaning:
      "Comms damage should focus on heat rejection, connector corrosion, antenna detuning, cable jacket abrasion, and packet-loss risk.",
  },
  {
    id: "edge-ai",
    label: "Edge AI compute",
    costSignal:
      "Qualcomm RB5, NVIDIA Jetson Orin, and similar modules convert autonomy from remote piloting into onboard perception and classification.",
    materialPoint:
      "High-density silicon packages, FR-4 or high-speed PCB stackups, copper planes, thermal pads, heatsinks, and sealed compute enclosures.",
    reportMeaning:
      "Compute health should explain throttling, solder fatigue, dust-insulated heatsinks, humidity leakage, and why thermal margin affects autonomy.",
  },
  {
    id: "open-controller",
    label: "Open controllers and marketplaces",
    costSignal:
      "ATAK/UVC, UC-LITE, UAS Marketplace, IDIQ, and CSO pathways reduce bespoke controller and procurement lock-in.",
    materialPoint:
      "The hardware burden moves from one proprietary ground station to rugged tablets, radios, battery kits, and software-defined interoperability.",
    reportMeaning:
      "The report should compare repair or replacement against modular substitution, not just component-by-component repair.",
  },
];

export const subsystemEquationText = {
  engine:
    "dH_engine/dt = -k_heat*max(T - Tcrit, 0) - k_cold*max(Tcold - T, 0) - k_dust*D",
  battery:
    "dH_battery/dt = -k_heat*max(T - Tcrit, 0) - k_cold*max(Tcold - T, 0) - k_uv*U^2",
  hydraulics:
    "dH_actuation/dt = -k_heat*max(T - Tcrit, 0) - k_cold*max(Tcold - T, 0) - k_uv*U",
  sensors:
    "dH_sensors/dt = -k_dust*D - k_humidity*max(RH - RHcrit, 0) - k_uv*U",
  chassis:
    "dH_chassis/dt = -k_humidity*max(RH - RHcrit, 0) - k_salinity*sigma^2",
};

export const vehicleHealthEquation =
  "H_vehicle = (4/13)H_engine + (3/13)H_battery + (3/13)H_actuation + (1/13)H_sensors + (2/13)H_chassis";
