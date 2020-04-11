# Master Thesis Code

## Traffic Simulation for an Air Pollution-aware Toll System with Dynamic Charging

My master thesis is about creating a traffic simulation an air pollution-aware toll system where prices are dynamically determined by real-time air pollution data. 
Air pollution data is interpolated and used to extract ***critical zones*** of air pollution based on given pollution thresholds. 
The vehicles are being tracked and the drivers are being charged based on the driven distance in each of the critical zones.

The simulation is used to experiment with different parameters and evaluate their effects:
  * Interpolation methods and their resulting critical zones
  * Vehicle tracking strategies
  * Charging schemes

Road data is taken from [OpenStreetMap](https://www.openstreetmap.org/) and realistic traffic demand is extracted from the [MATSim Berlin Open Data Scenario](https://github.com/matsim-scenarios/matsim-berlin). 

Air pollution data is taken from [Luftdaten.info](https://luftdaten.info/en/home-en/) and [OpenSenseBox](https://opensensemap.org/).

## Setup

### General Requirements

* [NodeJS + npm](https://nodejs.org/en/)
* [Python (Miniconda/Anaconda)](https://docs.conda.io/en/latest/miniconda.html)
* [Latest C++ Build Tool for Visual Studio](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)
* [SUMO (Simulation of Urban MObility)](https://sumo.dlr.de/docs/Downloads.php)

### SUMO (TraCI)

1. Download and install/unpack SUMO
2. Set `SUMO_HOME` environment variable to your SUMO install directory (e.g. `C:\Users\Mazel\Desktop\sumo-1.5.0`)
3. Add the `bin` directory of your SUMO directory to the PATH variable (e.g. `C:\Users\Mazel\Desktop\sumo-1.5.0\bin`)

## Dependencies

### NodeJS

1. Install [NodeJS](https://nodejs.org/en/) for your OS
2. Install NodeJS dependencies:

```
npm install
```

### Python/Miniconda/Anaconda

1. Install [Miniconda/Anaconda](https://docs.conda.io/en/latest/index.html) for your OS
2. Install Python dependencies:

```
conda env create -f environment.yml
```

## Preparation

1. Download necessary static input data

```
npm run setup
```

## Running the simulation

1. Activate the conda environment

```
conda activate apats-sim
```

2. Create a config file
3. Run `runSimulation.js` in the `simulation` directory with the following command:

```
node runSimulation.js --config <path to the config file>
```

---

## Configuration File

| Key| Type | Possible Values | Example | Description |
| - | - | - | - | - |
| mode | String | `osm`, `matsim` | `"osm"` | Determines where the input data comes from |
| scenario | String | `1pct`, `10pct` | `"1pct"` | Determines which MATSim scenario is used for input plans (1pct should be the test scenario, 10pct is the full scenario) |
| bbox | Array | `[south, west, north, east]` | `[52.5056, 13.3075, 52.5182, 13.344]` | Bounding Box for the OSM case and also for limiting the parsed MATSim plans only for the given bbox |
| pollutant | String | `PM10`, `PM2.5` | `"PM10"` | Determines which pollutant measurements is being fetched |
| simulationDate | String | - | `"02.02.2020"` | Determines from which day the pollutant measurements should be fetched |
| zoneUpdateInterval | Number | - | `60` | Determines in which interval (in minutes) the zones should be updated. For example every 60 minutes. |
| interpolationMethod | String | `"idw"`, `"nearest-neighbor"`, `"natural-neighbor"`, `"linear_barycentric"` | `"idw"` | Determined the interpolation method to be used to create the air quality zones |
| visualizeZones | Boolean | - | `true` | Determines if the simulation should create images of the interpolated air quality zones |
| freezeZones | Boolean | - | `true` | Determines if the zones are "frozen" for when vehicles enter the simulation. If it true, vehicles are only being tracked according to the zones that were active when they entered the simulation. If it is false, vehicles are always being tracked according to the most recent zones.  |
| enableRerouting | Boolean | - | `true` | Determines if vehicles should be rerouted |
| dynamicRerouting | Boolean | - | `true` | Determines if vehicles should be rerouted at insertion or dynamically when they approach an air pollution zone |
| dynamicReroutingDistance | Boolean | - | `true` | Determines the distance to the zones when vehicles should be dynamically rerouted

## Known Errors

* `RuntimeError: b'no arguments in initialization list'`

  Try to solve this issue with one of the solutions mentioned [here](https://github.com/pyproj4/pyproj/issues/134)

* `Microsoft Visual C++ 14.0 is required`

  You can resolve this by installing the latest "Build Tools for Visual Studio" from [here](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)