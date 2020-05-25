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
  * ~~Find smaller OSM network version~~
  * ~~Apply DUAROUTER to trips and check the outcome~~

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
  * ~~Test conversion of GK4 coordinates to WGS84 and see where it is located on the OSM map~~
  * ~~Check if it is a valid approach~~

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

* ~~Finish the simulation preparation~~
* ~~Continue working on TraCI~~

## 18.02.2020

* Work on simulation prep
* Testing if it works better to do trips with MATSim link IDs, LongLat or the converted osmEdge
  * MATSim scenario takes the least amount of disk space. The network file is a lot smaller than OSM and I think its because a lot of network information is not 100% and info gets lost in the conversion
  * LongLat works best for OSM bbox. Duarouter finds the closest edge to fromLongLat and calculates the best route to the nearest edge of toLongLat
  * osmEdge sadly does not really work because when the OSM network gets converted to the SUMO format the OSM ids dont stay the same. There are some suffixes added or a "-" for bi-directional edges
* Test out multiple duarouter and netconvert options for better conversion and routing results

## 20.02.2020

* Research about rerouting possibilities via TraCI
* Brainstorming about parameters to tune during simulation:

### Air data

* How often do you update the areas? (updateInterval)
* Which algorithm is used to interpolate air quality data? (interpolationMethod)
* Which algorithm is used to polygonize air quality zone? (polygonizationMethod)

### Car data

* How many cars are of which emission type? (carEmissionTypeDistribution) (e.g. electro/euro4/etc.) (effects the price they pay)
* How many cars are of which car type? (carTypeDistribution) (e.g. small car/suv) (effects the price they pay)
* Price sensitivity distribution?
  * Mercedes SUV drivers have lower sensitivity than Renault Twingo drivers -> Important for deciding if to reroute the vehicle.
  * How many people might even avoid the car at all due to increased travel cost?
  
### Pricing data

* How many zones do you make? (numberOfZones)
* Is the number of zones constant or also dynamic depending on levels of pollution? (dynamicZones)
* Price per zone? (pricingScheme)

## 21.02.2020

* Thinking about challenges for the TraCI implementation
  * I need to know all the edges that are within a certain zone
  * Once a vehicle enters the simulation I need to track its data and once it has left I need to remove it from memory so I don't run into memory overflow issues
  * I might have to create my own log files with the tracked information
  * Reroute at insertion or dynamically as soon as vehicle approaches a zone?

* Worked on TraCI implementation
* Successfully implemented rerouting via artificially increased vehicle-specific travel time on the edges of the zone
  * Storing list of all polygons
  * Storing list of all edges for each polygon
  * Every time a vehicle is inserted into the simulation I look at the route and check if any of the edges are included in any of the polygons
  * If yes, I set the edge travel time to 999999 for all edges and trigger a reroute
  
## 23.02.2020

* Implemented dynamic routing when vehicle reach a certain distance to a polygon/zone
* Added more config parameters to config file
* Discovered *OpenSenseMap* at the Futurium yesterday
* Start to look into OpenSenseMap API and the data they provide
* Start building fetching script
* Added general air data fetching script that combines the measurments from multiple sources (OpenSenseMap and Luftdaten.info)

## 24.02.2020

* Finished writing fetching script for OpenSenseMap
* Updated Luftdaten.info fetching script to filter data for certain dates + times of day
* Idea is to set a date of simulation in the config file and then all the air data from this day is being fetched and used in the simulation

## 25.02.2020

* Remake the Python setup and move to Miniconda
* As alternative to QGIS I start experimenting with python for spatial analysis in a jupyter notebook

## 26.02.2020

* Resolve python/conda issues with jupyter and other packages
* Research on air pollution interpolation
* Start implementing interpolation methods
* Implemented nearest neighbor method + created visualizations

Planned interpolation methods:

* Nearest neighbor with Voronoi diagram
* Triangulated irregular network with Delauny Triangulation
* Natural neighbor with Voronoi diagram
* Inverse distance weighting
* Radial Basis Function
* Thin Plate Splines
* Kriging

Mostly taken from the Athens Spatial Interpolation paper
I see most success in the last 4 ones

Future Work: Implement ANN for interpolation as tested in the paper

## 29.02.2020

* Implemented first version of IDW -> Definitely has potential for better performance implementation (I am just a python/numpy/scipy noob)

## 01.03.2020

* Experimenting with more interpolators
* I am not sure how to turn the interpolated date into polygons

## 02.03.2020

* Exam learning day
* Think about how to create polygons from the interpolated data
* Possibility: pyplot contours

## 03.03.2020

* Work on interpolation
* Use pyplot contour to create discrete zones
* Extract the contour polygons from pyplot and convert them into GeoJSON using `shapely` and `geopandas`
* Performance improvement on IDW

* List of parameters to adjust regarding interpolation
  * Number of zones
  * How to divide the levels of PM (Start at 0 or start the zones at minimum of X)
  * Equally divided zones?

## 04.03.2020

* Clean up interpolation code
* Add CLI options to the interpolation code so I can automatically run it from node scripts
* I built a test script that downloads all data for every hour of a day and runs every interpolation method on every hourly data collection. It outputs the visualizations of the different zones
  * Problem: There are some sensors that obviously have wrong data so I might have to filter sensors whose values are above a certain max value
  * Visualizations look interesting and I seem to be on the right track

## 05.03.2020

* Another problem: SUMO can't handle polygons with holes so in order to track the movements within the single zones we need to calculate it somehow by subtracting the distances from inner zones from the distances in the outer zones
  * These calculations can be done after the simulation has finished as well as applying different pricing schemes to the zones

TODO:

* ~~Add interpolation config parameters to simulation config file~~
* Add more interpolation methods (Kriging and Spline)
* ~~Rewrite air data fetching script to accept a date range instead of a single datetime~~ -> Went back to single date to simplify things. Its all for internal use anyway.
* ~~Filter extreme/wrong sensor values and do more visual validation on the data/zones~~ -> Filter malfunctioning sensors by hand (look at the map and filter the IDs)
* ~~Integrate air data fetching + interpolation into automatic simulation flow~~
  * ~~Add polygons to SUMO~~
  * ~~Track vehicles according to polygons/zones~~
  * ~~Update polygons and continue tracking~~

* For the air data: should I take the moment values or hourly/x-minutely averages?
* Should I do the air data fetching + interpolation before the simulation runs or on the fly?
  * I think before hand would be better

* How should I go about validation and evaluation?
  * Do one simulation run without any toll system and then compare this data to the simulations with the toll system
  * Do some brainstorming on metrics to collect, implement them and run the simulation

## 06.03.2020

* Rewrite air data fetching script to accept a date range instead of a single datetime
* Filter extreme/wrong sensor values and do more visual validation on the data/zones

## 07.03.2020 + 08.03.2020

* Experiment with other interpolation methods

# 09.03.2020

* Update SNET Latex Template because I need to start writing!!!

# 10.03.2020

* Make GeoJSON to Polygon conversion script handle multiple polygons
* First time that I converted the GeoJSON zones files from the interpolated data into SUMO polygons and imported them
* Researching more libraries for interpolation methods
  * Found MetPy which seems promising for natural neighbor

TODO:

* ~~Investigate MetPy library for natural neighbor and other IDW implementations~~
* ~~Investigate scipy for Spline interpolation~~
* ~~Investigate sklearn for Kriging/Gaussian Process interpolation~~

# 12.03.2020

* Added metpy natural neighbor
* Still troubles with Spline and Kriging

TODO:

* ~~Add more config parameters to config file~~
* ~~Make simulation run with all the created zone files~~

# 13.03.2020

* Added airdata interpolation config parameters to config file
* Testing on inner berlin scenario
* Simulation preparation successfully runs from start to finish and opens up SUMO

TODO:

* ~~Make TraCI import the zone polygons and change them on every timestep~~
* ~~Do an actual test run~~

# 14.03.2020

* TraCI is successfully importing the zone polygon data and exchanging them as the simulation runs
* Problem:
  * The maximum amounts of coordinates for a polygons in SUMO is 255
  * I need to find a way to split too big polygons
  * I am thinking of taking the boundary, halve it, calculate the intersection with each half and create a new polygon from each intersection

# 15.03.2020

* Fixed the problem of too big polygons by splitting them dynamically into smaller parts that are always smaller than 255
* Updating polygons throughout the whole simulation works

~~FIXME: There is no data for the start of the simulation... I would need the data from the previous day~~

* Problem: Some plans in MATSim don't have departure times for `<leg mode="car">`
  * I solved it by calculating the depature time through tracking `trav_time`, `max_dur` and `end_time`

* Fixed many bugs in the rerouting
* Make sure dynamic rerouting also checks the newly inserted vehicles if they are spawned within a zone

# 16.03.2020

* Awesome meeting with Sandro!!!
* He was super impressed by my progress and what I have achieved <333
* Got an email from TU Berlin with information about the Corona situation and the consequences for students

**Due to closed libraries every deadline for any thesis will be extended for one month 🎉**

# 19.03.2020

* Add python script to compare different grid cell sizes
  * Result: No real visible difference in zone shape after 100m cell size
* Add python script to compare different natural neighbor methods
  * Result: They all look quite similar so I will just use the fastest (discrete)

# 20.03.2020

* Identified malfunctioning sensors via the interactive map of Luftdaten.info
  * Filter these to avoid false data
* Fix missing data for 00:00:00 timestep by fetching data on the previous day of the simulation date

TODO:

* Figure out how to calculate the distances in the zones because the SUMO polygons don't have holes in them
  * Does it make sense to calculate distance with in the single polygons or already add them up to the zone? I think the first option.
* Invest more time into Kriging and Spline?

# 21.03.2020

* Make all python code align with recommended code style (mainly use underscores instead of camelCase)
* Break apart the listener.py file into multiple different files with different responsibilities
  * Make use of the TraCI StepListener class
  * Use Publish/Subscribe design pattern to inform certain controllers when the zones have updated

TODO:

* What to do during static rerouting when zones change? Reroute all vehicles in the simulation or let their route stay as it is?

# 22.03.2020

* Thinking about details of TraCI behaviour
* Collection of special cases to think about regarding vehicle behaviour:
  * Destination of vehicle is inside a zone
    * Should this person reroute at all?
    * Should this person be rerouted to find the "cheapest" way?
    * Don't reroute if the new route is greater than double the length of the previous route?
  * Zones change
    * Should vehicles all be rerouted again?
    * According to which polygons should vehicles be tracked?
      * Always the new polygons?
      * Those polygons that were in the simulation when they were inserted?
  * A zone has a hole
    * Should vehicles be rerouted to always take the cheapest route?
  * Static rerouting: How should vehicles that are already in the simulation behave when suddenly the zones change?
    * Reroute them?
    * Leave their routes as they are since this is the static approach?

* Do a lot of code refactoring for the rerouter
* Fix crucial detail that ALL edges of ALL polygons need to be set to a high traveltime, not only the polygons that intersect with the current route!!!
* Make zone manager the "single source of truth" about polygon edge data

# 23.03.2020

* Polygons with holes are a problem!
  * I found an edges where a hole is actually not a different zone but an actual hole where people should not be charged at all (02.02.2020, 07:00:00, IDW)
  * This could also an important issue for rerouting -> In order for vehicles to always take the cheapest route the traveltime for all edges within the holes should NOT be adjusted!
  * **I posted a message to the SUMO mailing list to ask if there is an official way of handling polygons with holes [here](http://sumo-user-mailing-list.90755.n8.nabble.com/sumo-user-Polygons-with-holes-td3067.html)**
    * Got an answer on the same day in the evening 👌
    * In short: There is no support. Alternative solution: Make holes into their own polygons or split the polygon into polygons without holes.
  * I have done some research on algorithms to convert polygons with holes into simple polygons that don't have holes but it seems like a very complex task to implement
  * My solution would be to create the holes as polygons in SUMO (with no background color) and make them clearly identifiable as holes (through their ID for example)
    * Makes it lot easier to track the driven distances inside the holes and subtract them afterwards
    * Easy to know which edges are within holes and which are not

Before

![](pictures/polygon-holes-in-sumo.png =700x)

After

![](pictures/polygon-holes-in-sumo-fixed.png =700x)

* Do more bug fixing and ensuring TraCI is behaving correctly
* Refactoring of code to make it easily extendable
* Now allowing each vehicle to decide which zones to avoid (complexity of this decision can be arbitrary)

# 24.03.2020

* Code restructuring, bug fixing, performance optimization
* Decided to not remove old polygons from the simulation. This way I can still track vehicles in previous zones.
* Tracking vehicle distances for each timesteps in any polygon (previous or current)
* Now I can simulate two scenarios at the same time: When zones change people get charged by the old zones which were there when they entered the simulation or always the most recent zones
  * It's just a matter of how you add up the distances in the end

# 25.03.2020

* Digging further into SUMO outputs and what could be used for evaluation
  * `emissions.xml`
    * Outputs emission for every vehicle in every timestep at current location
    * Emissions: CO2, CO, HC, NOx, PMx, fuel, electricity, noise
    * Compare the emissions per vehicle in different rerouting scenarios (no rerouting, static, dynamic close, dynamic far)
  * `routes-info.xml`
    * Information about every vehicle and its route
    * Stores information about the rerouting effect (cost, savings, new edges)
    * I might need to calculate and store the distance of the new routes after the rerouting action
  * `trips-info.xml`
    * Gives information about the trips as a whole
    * Duration, length, emissions, waitingTime, waitingCount, timeLoss
  * `vehicle-summary.xml`
    * Stores vehicle information about every step
    * How many vehicles were loaded, inserted, running, waiting, arrived etc.
    * Mean waiting time, mean travel time, mean speed, mean speed relative

* Add snapshotZones simulation config parameter
  * When zones are frozen the agents only reroute and are charged based on the zones that existed during the timestep where they were inserted into the simulation
  * When zones are NOT frozen agents always reroute and are charged according to the most recent zones

QUESTION: What to do in the snapshotZones: false case when zones change? Are vehicles rerouted?

TODO:

* ~~Test snapshotZones~~
* ~~Explore SUMO outputs for evaluation~~

# 26.03.2020

* Read more about output files

# 27.03.2020

* Start writing and creating an outline for the thesis

# 28.03.2020

* Take yet another look into kriging but this time avoid any libraries
* Created the variogram and histograms for the data
* Checked the assumptions for Kriging listed [here](https://gisgeography.com/kriging-interpolation-prediction/)
  * Normal distribution -> No, even standardizing it did not help very much
  * Spatially correlated -> Not necessarily

# 29.03.2020

* Problem: I used matplotlib for creating contours and the polygons but there is no official source that states which algorithm is used
  * It 99.9999% Marching Squares which is also used in MATLAB
  * If I have no source that states that it is hard to argue
  * I searched for a different library (skimage) that has a contour algorithm where it officially says it is implementing Marching Squares

* Worked on implementing contour algorithm from the skimage library
* Works exactly as the matplotlib version and it looks exactly the same
* Tested it with the validation script. Works well and looks the same.

# 30+31.03.2020

* Implement cross validation script
  * IDW is clearly the winner from Nearest Neighbor, Natural Neighbor, IDW and RBF
  * No Spline and no Kriging yet
