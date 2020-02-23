# Master Thesis Code

## Thesis Topic: Traffic Simulation for an Air Pollution-aware Toll System with Dynamic Charging

A collection of all code used for my master thesis

## Setup

### General Requirements

* NodeJS
* npm
* Python 64bit
* pip

### SUMO (TraCI)

1. Download and install/unpack SUMO
2. Set `SUMO_HOME` environment variable to your SUMO install directory (e.g. `C:\Users\Mazel\Desktop\sumo-1.5.0`)
3. Add the `bin` directory of your SUMO directory to the PATH variable (e.g. `C:\Users\Mazel\Desktop\sumo-1.5.0\bin`)

## Dependencies

Execute all commands in project root

```
1. npm i
2. pip install -r requirements.txt
```

## Running the simulation

1. Create a config file
2. Run `runSimulation.js` in the `simulation` directory with the following command:

```
node runSimulation.js --config <path to the config file>
```

---

## Configuration File

TODO: Write all the details about the properties of the configuration file

| Key| Type | Possible Values | Example | Description |
| - | - | - | - | - |
| name | String | - | `"Berlin Simulation"` | Name of your simulation |
| mode | String | `osm, matsim` | `"osm"` | Determines where the input data comes from |
| scenario | String | `1pct, 10pct` | `"1pct"` | Determines which MATSim scenario is used for input plans (1pct should be the test scenario, 10pct is the full scenario) |
| bbox | Array | `[south, west, north, east]` | `[52.5056, 13.3075, 52.5182, 13.344]` | Bounding Box for the OSM case and also for limiting the parsed MATSim plans only for the given bbox |
| enableRerouting | Boolean | - | `true` | Determines if vehicles should be rerouted |
| dynamicRerouting | Boolean | - | `true` | Determines if vehicles should be rerouted at insertion or dynamically when they approach an air pollution zone |
| dynamicReroutingDistance | Boolean | - | `true` | Determines the distance to the zones when vehicles should be dynamically rerouted