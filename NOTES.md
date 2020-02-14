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

## 24.01.2020

# Sandro meeting

* Can you add cost of edge PER CAR or is it global?
* rerouting
* sandro schreibt dlr mail

* concept
  * tool chain ohne die techniken zu erzählen
  * was wollen wir rauskriegen und wie

* implementation
  * toolchain mit tools

## 25.01.2020

* Someone responded to my GitHub issue!!
* Realized that there is a `<activity type="car interaction">` before every `<leg mode="car">`
* All coordinates are in GK4
* TODO:
  * Test conversion of GK4 coordinates to WGS84 and see where it is located on the OSM map
  * Check if it is a valid approach

## 26.01.2020

* Start working on OSM Edge conversion
* Worked great on test case
* Problem:
  * Some edges can't be 100% identified based on the `car interaction`. Overpass API returns more than 1 edge. Maybe choose random?

## 27.01.2020

* Edge conversion is working but it is not efficient
* Question: Should I query the overpass API on the fly everytime I encounter an unseen edge or should I somehow try to convert the whole MATSim network in advance?
* At best I should also store the mapping between MATSim and OSM edges permanently somewhere so I don't have to do the conversion multiple times
* Should I set up an own overpass API server on my machine?

### Evening update

* Wrote a MATSim to OSM mapper
  * Parses all nodes and edges
  * Loops through all edges and queries the overpass API for all edges close to the `from` and the `to` node (radius 5m)
  * I assume that the combined results of both queries should have (at least) one duplicate edge ID which should be the OSM edges that is connecting the two nodes
* Used SQLite to store MATSim network data and OSM mapping

## 28.01.2020

* Built an MATSim Network Builder for Simunto for better testing purposes
* Continued working on OSM mapping
* Problem: How to deal with edges that can't be uniquely identified...?
  * Maybe repeat the OSM queries with a greater radius

## 29.01.2020

* Investigating the problematic cases of edge conversion (no edge found at all + no unique edge found)
* I need to get more into the overpass query language to optimize the queries to find the edges

### No edge found

* Sometimes a MATSim Link is split into smaller sub-edges in OSM -> Reason for script not finding an edge because there is a "middle piece" that is not found. 
* Solutions
  * Iteratively increase the search radius until a unique overlapping edge is found

### No unique edge found

* Sometimes there are multiple OSM edges very close to the start and end point of a MATSim link
* Solutions:
  * Somehow find the closest one
    * Choose the one with the closest center point
    * Choose the one with the smallest bbox
  * Just take a random one from the overlapping ones


### Comment on MATSim Berlin Github Issue

* *netconvert can import MATSim networks directly using option --matsim-files*
  * I did that but there are a lot of warnings and some parts of the network are a bit weird
  * Also the number of lanes are quite often incorrect. 
  * Tried different matsim import settings from the SUMO docs but nothing gave me better results

* *netconvert can also create MATSim networks from any of the supported input formats using option --matsim-out*
  * I saw that but I don't need to output any MATSim networks

* *SUMO includes the tool matsim_importPlans.py (in tools/import/matsim) which can import matsim plans (either vehicles or vehicles and persons)*
  * I did not know about this until now
  * I tried it but I get errors when I try to import the Berlin plans
  * It does nothing else than copying the edges from the plans into the `edges` property of a `route` definition... not very helpful because I don't prefer to use the imported MATSim network
  * The script is only about 100 lines long so I don't mind writing my own parser

* *the sumo and duarouter applications can import trip data that is specified in terms of xy or lonLat coordinates*
  * I also did not know about the definitions of trips via XY or LongLat. Previously I had only used the from (edge id) to (edge id).
  * I can't use the XY values from the plans because those are in GK4 and when importing the converted MATSim network the internal SUMO XY values are totally different and are just a regular plane
  * I might be able to convert the GK4 XY into WGS84 and then use those coordinates on the OSM network

## 30/31.01.2020

* Optimize overpass queries and fix all the problems
* Store all data into PostGreSQL

## 05.02.2020 - 09.02.2020

* Let OSM Mapper run to find an OSM edge for every MATSim edge

## 10.02.2020

* Work on automating scripts and trip/route generation

## 11-14.02.2020

* Reorganize a lot of code
* Rewrite many scripts to function both as CLI script and exported node module
* Add general prepare script that downloads all necessary input data (takes a few minutes). This simplifies the simulation preparation.
* Adding support for more config parameters for the simulation

TODO: 
* Finish the simulation preparation
* Continue working on TraCI
