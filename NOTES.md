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


