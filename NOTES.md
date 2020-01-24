# Notes for my Master Thesis

## Previously

* Write scripts for fetching air quality data from different sources
* Transform air quality data into format that I can import into QGIS
* Start working with QGIS to visualize Berlin districts and interpolate air quality data
* Trying to get QGIS running without GUI by just using their Python API (PyQGIS)
  * Tried to so hard but it is horribly documented
  * I was constantly running into soooo many different errors about modules not being found etc.
  * Fuck this shit... I can't be arsed anymore...
* Decided on writing scripts for QGIS that need to be executed inside the Python console of the QGIS GUI
* Got basic scripts running that import the Berlin district data
* Running into some issues regarding the automatic interpolation of the air quality data
* Will fix these later when I get SUMO and the demand model with TraCI running


## 01.01.2020

* Move Thesis Code from GitLab to GitHub

## 04.01.2020

* Problems with QGIS on Windows
* Try out QGIS on Ubuntu WSL
* Create bash file to setup QGIS on Ubuntu automatically

---

* Automize MATSim/OSM Network download
* Network conversion from MATSim to SUMO using the tool NETCONVERT workes but it shows a few warnings and conversion problems
* Import the converted network into SUMO works fine. You can see all the streets inside and outside of Berlin.
* I checked that the node IDs from MATSim network are being kept by the conversion tool

## 06.01.2020

* Started writing MATSim plan parser

## 12.01.2020

* Work on MATSim plan parsing
* Update parser to use Node Streams because files are very large
* First successful parsing/conversion of MATSim test population into SUMO format
* Problems:
  * When running SUMO with the converted network and the converted plans it leads to an error that a connection between two edges is missing in SUMO.
    * I feel like this is coming from automatic conversion from the MATSim network. Some links might be broken by the tool.
  * Some routes have a really weird format (experimentalPt) I don't know what it means yet...

--- 

* Idea to make sure the edges in the plans are correct: Get the MATSim Berlin Scenario running locally
* Tried to get MATSim Berlin scenario running locally but ran into some problems:
  * Could not increase memory usage in GUI tool larger than 1700mb
    * Java Object Heap Out of Memory -> Make sure Java 64bit version is installed

## 15.01.2020

* Got the MATSim Berlin scenario running successfully on my Desktop PC
* The 1pct scenario was running over night for 11-12 hours

## 16.01.2020

* Work more on parser
* Generating my own input plan data did NOT help the edge error mentioned above (12.01.2020)
* Options to fix the edge error:
  * Ask DLR for their demand model (I guess this would be the easiest)
  * Only parse the starting/ending node from every route and SUMO do the routing
    * Use [DUAROUTER](https://sumo.dlr.de/docs/DUAROUTER.html) to calculate routes
    * I am not sure if this may cause any inaccuracies regarding the demand model. I don't think it will because in the end during my own simulation the routes of the drivers will change anyways.

## 19.01.2020

* Add conversion of MATSim plans to SUMO trips in order to convert them using DUAROUTER
* Try to import OSM network into SUMO to check if the coordinates of every node in the MATSim network is equal to the same location of that node in the OSM network
  * Problem: OSM file is extremely large. Import takes like 30 minutes. 
  * Maybe try to find a smaller version (only roads) of the OSM network
* TODO:
  * Find smaller OSM network version
  * Apply DUAROUTER to trips and check the outcome

## 20.01.2020

* DUAROUTER works on the generated trips but I feel like the routes are unnecessarily long 
  * I could maybe use it for the OSM approach
* Try and use `osmGet.py` + `osmBuild` to extract smaller OSM network. Did not really work.

## 21.01.2020

* Realized the converted MATSim network is horrible and looks really weird in some places
* Tried to circumvent the "missing connection between edges" error by manually removing some edges from some plans but the error keeps popping up again and again 
  * -> This is not really a feasable options
* Successfully used the Overpass API to get only the road network from OSM
* I was able to open it in SUMO
* Next problem: How do I convert the MATSim plans from its format to OSM coordinates?
  * Submitted GitHub issue to ask for help
* Maybe DUAROUTER could be useful for plan conversion once I figure out the mapping of the coordinates

## 23.01.2020

* Amazing day of progress <333
* Started implementing TraCI
* Added conversion from GeoJSON to SUMO polygon specification
* Import the polygon shape into SUMO and use them to track the vehicles
* Added vehicle distance tracking for polygons


