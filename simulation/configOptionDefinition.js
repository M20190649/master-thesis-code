const modes = ["osm", "matsim"]
const scenarios = ["1pct", "10pct"]
const pollutants = ["PM10", "PM2.5"]
const interpolationMethods = [
  "nearest-neighbor",
  "natural-neighbor",
  "idw",
  "linear-rbf",
  "mq-rbf",
  "imq-rbf",
  "thin-plate-rbf",
  "kriging",
]

const configOptionDefinitions = [
  {
    name: "mode",
    type: String,
    description: `Decides from which source the network data is generated \n (Possible values: ${modes.join(
      ", "
    )}`,
    required: true,
    possibleValues: modes,
  },
  {
    name: "scenario",
    type: String,
    description: `The MATSim scenario that should be loaded \n (Possible values: ${scenarios.join(
      ", "
    )})`,
    required: true,
    possibleValues: scenarios,
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "[s, w, n, e]",
    description:
      "The bounding box for this simulation \n (Note: This simulation is designed for the MATSim data for the city of Berlin, Germany)",
    required: true,
  },
  {
    name: "pollutant",
    type: String,
    description: `The pollutant for which the air pollution data should be downloaded \n (Possible values: ${pollutants.join(
      ", "
    )})`,
    required: true,
    possibleValues: pollutants,
  },
  {
    name: "simulationDate",
    type: String,
    description: `The date for which the pollutant data should be downloaded \n (Format: dd.mm.yyyy)`,
    required: true,
  },
  {
    name: "zoneUpdateInterval",
    type: Number,
    description: `The interval determines how often the air pollution zones should be updated (in minutes)`,
    required: true,
    maxValue: 24 * 60,
    minValue: 1,
  },
  {
    name: "averagingInterval",
    type: Number,
    description: `The interval determines for how much time prior to the zone timestep measurements are being consired for the averaged value`,
    required: true,
    maxValue: 24 * 60,
    minValue: 1,
  },
  {
    name: "averagingMethod",
    type: String,
    description: `The averging method used for averaging all measurements within the averaging interval`,
    required: true,
    possibleValues: ["simple", "weighted"],
  },
  {
    name: "interpolationMethod",
    type: String,
    description: `The interpolation methods that should be used to fill in the missing data points at unknown locations \n (Possible values: ${interpolationMethods.join(
      ", "
    )})`,
    required: true,
    possibleValues: interpolationMethods,
  },
  {
    name: "zones",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "[number]",
    description:
      "A list of values that determine the lower and upper bound of each air pollution zone. The more values the more zones there will be.",
    required: true,
  },
  {
    name: "periodicRerouting",
    type: Boolean,
    description: `Determines if SUMO should periodically reroute vehicle to check that they are on their optimal route. This helps to avoid unrealistic traffic jams.`,
    required: true,
  },
  {
    name: "zoneRerouting",
    type: String,
    description: `Determines if agents in the simulation should be rerouted if they pass through air pollution zones`,
    required: true,
    possibleValues: ["none", "static", "dynamic"],
  },
  {
    name: "reroutingDecisionMode",
    type: String,
    description: `Determines according to which strategy the agent should make their decision to reroute`,
    required: true,
    possibleValues: ["none", "percent", "random"],
  },
  {
    name: "reroutingPercent",
    type: Number,
    description: `For reroutingDecisionMode = "percent": Determines what percent of agent decide to reroute`,
    required: false,
    minValue: 0,
    maxValue: 1,
  },
  {
    name: "dynamicReroutingDistance",
    type: Number,
    description: `Determines the distance for when agents should be dynamically rerouted (Requires zoneRerouting to be "dynamic")`,
    required: false,
    minValue: 1,
    maxValue: Infinity,
  },
  {
    name: "snapshotZones",
    type: Boolean,
    description: `Determines if agents only see the zones from the timestep when they were inserted or if they always see the most recent zones`,
    required: true,
  },
  {
    name: "rerouteOnZoneUpdate",
    type: Boolean,
    description: `Determines if a static/dynamic reroute should be triggered when the zones update`,
    required: true,
  },
  {
    name: "nonDepartDecisionMode",
    type: String,
    description: `Determines according to which strategy the agent should make their decision if to use the car or not`,
    required: true,
    possibleValues: ["none", "percent", "random"],
  },
  {
    name: "nonDepartPercent",
    type: Number,
    description: `For nonDepartDecisionMode = "percent": Determines what percent of agent decide not to use the car`,
    required: false,
    minValue: 0,
    maxValue: 1,
  },
]

module.exports = configOptionDefinitions
