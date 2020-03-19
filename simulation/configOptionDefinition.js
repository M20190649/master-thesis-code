const modes = ["osm", "matsim"]
const scenarios = ["1pct", "10pct"]
const pollutants = ["PM10", "PM2.5"]
const interpolationMethods = [
  "nearest_neighbor",
  "discrete_natural_neighbor",
  "metpy_natural_neighbor",
  "scipy_natural_neighbor",
  "idw",
  "linear_barycentric",
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
    name: "visualizeZones",
    type: Boolean,
    description: `Determines if the interpolation script should create images of the resulting zones`,
    required: true,
  },
  {
    name: "enableRerouting",
    type: Boolean,
    description: `Determines if agents in the simulation should be rerouted if they pass through air pollution zones`,
    required: true,
  },
  {
    name: "dynamicRerouting",
    type: Boolean,
    description: `Determines if agents in the simulation should be rerouted statically (immediately when they are inserted into the simulation) or dynamically (only when agents get closer than X meters to the zone)`,
    required: true,
  },
  {
    name: "dynamicReroutingDistance",
    type: Number,
    description: `Determines the distance for when agents should be dynamically rerouted (Requires dynamicRerouting to be true)`,
    required: true,
  },
]

module.exports = configOptionDefinitions
