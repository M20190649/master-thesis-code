# Meeting 24.01.2020

### Demand 
* Many problems with converting MATSim demand model
  * Edges were not found

### Air Data
* Implemented fetching scripts
* No interpolation at all

### TraCI
* Very first steps in TraCI
* Started calculating the distances driven in each polygon

# Meeting 16.03.2020

## Achievements

### Demand
* Convert demand model from MATSim to SUMO trips (x and y were just a different coordinate system)
* Create trips file from demand model
  * Every trip has a `fromLonLat` and `toLonLat`
  * Longitude and latitude values are converted from the x and y from the MATSim CRS
* Trips file is used with the SUMO DUAROUTER to create the routes for the vehicles
  * In the beginning I tried to convert the exact edge order from MATSim but I ran into a lot of issues
  * Now I just provide start and end **location** and DUAROUTER finds the nearest edge and calculated the best route

### Network
* It is possible to use the MATSim network or the OSM network
* MATSim network has a lot of weird edges and PT edges which I don't think I need
* For OSM I query the OSM API and download any custom bbox to use for simulation
* Both MATSim and OSM conversion to SUMO have many warnings/errors but I think the OSM result is much better and reliable/reality-like

### Air Data
* Discover new air data source
  * Luftdaten.info -> Ist bereits bekannt
  * [openSenseMap](https://opensensemap.org/)
  * [opensense.network](https://www.opensense.network/)
* Combines multiple air data sources
* Switch from QGIS to Python (esp. using numpy, scipy, geopandas, matplotlib)
* Interpolate data using different methods (some are still missing because I am not a genius with data science)
* Create zones using contour algorithm from matlab (uses [Marching squares](https://en.wikipedia.org/wiki/Marching_squares))
* Extract these contour zones into GeoJSON polygons
* Convert GeoJSON polygons into SUMO poly format
* Import them via TraCI at the right timesteps

### TraCI
* Importing converted demand model
* Implement static rerouting (immediately reroute vehicles once they are inserted)
* Implement dynamic rerouting (only reroute vehicles if they are inserted inside a zone OR they reach a certain distance to any zone)

### Automization
* One config file with many options

--- 
## Problems

### Demand
* Some plans in MATSim don't have departure times for `<leg mode="car">`
  * I solved it by calculating the depature time through tracking `trav_time`, `max_dur` and `end_time`

### Air Data
* Some sensors report values greater than 600 -> Can I trust the sensors?
* Simulation should span 24h?
  * Problem: I don't have data for start of simulation (00:00:00) because I would need the data from the previous day 

### TraCI

* SUMO can't handle polygons with holes
  * Somehow calculate the distances in each zone by subtracting the distances in the polygons from each other
* SUMO limits the number of points for a polygon to a maximum of 255
  * Solution: Split the polygons into multiple parts

---

## Next Steps

### Demand
* SUMO demand model?

### Air Data
* Parameters for interpolation and the resulting zones
  * Grid density
  * Interpolation method
  * Which sensor data can I trust?
  * Individual interpolation method parameters (k for IDW, other smootheness parameters for other methods)
  * How many zones?

### TraCI
* What if the destination of a route is within a zone? Should that vehicle be charged? (FUTURE WORK)
* How should price sensitivity be modeled? Avoid routing based on price sensitivity?
* Different vehicle models? SUV, regular, electric?

### Pricing
* Can be calculated afterwards by multiplying a certain pricing scheme with the driven distances within the zone
* How to design pricing?
* How many zones?

### Evaluation
* Which metrics from the simulation should be collected and evaluated?
  * Number of rerouted vehicles
  * Extra driven distance/time
  * Extra used fuel
  * Heatmap of car activity to see where traffic hotspots are moved to
  * Emissions

---

## Results

* Some sensors report extreme values which are most likely wrong
  * Prechecking raw/averaged measurements
  * Take 10 closest neighbors and check how much their values differ
  * f(distance) = threshold
  * **Determing such a function is difficult. The spatial distribution of air pollutants can vary by significant amounts within a small radius.**
  * **Solution: Averaging and filtering of handpicked malfunctioning sensors**

* How to validate the choice of interpolation parameters?
  * Grid density
    * Take different densities and apply them with one interpolation method to measurement values of one hour of some day
    * **Result: No significant changes for the zones after a cell size of 100m**
  * Interpolation method
    * Take small part of map and do cross validation
    * **Result: idk lel**
  * Zones
    * Use UBA (easy to argument/justify)
    * Experiment with 2-10 zones

* How should I treat the case if zones change while cars are in the simulation?
  * In theory, people should be able to calculate the price of a ride in advance so the zones should stay as they are for those people
  * Implementing this behaviour might be a lot of effort... this could be future work
  * Current solution: When zones change people are charged according to the new zones immediately

* How does an agent decide he wants to reroute?
  * We discussed a lot about this and came to the conclusion that you could make this arbitrarily complex. You could consider:
    * Wealth distribution (poor people will reroute, rich will pay)
    * Length of distance driven in zone (if someone just drives 50m in a zone it shouldn't be an issue to anyone, 5km is a different story)
  * It would be best to extract this into a function that return a boolean. The complexity behind this can be increased later in future work
  * For now we might just say 5% reroute and the rest will decide to pay (stay on their current route)

* For the people who are not willing to pay: Will they decide to still take the car and circumvent these zones or will they not take the car at all and switch to public transport?
  * Or do they maybe to park & ride? -> Drive near zone, park and then take public transport?
  * For now we can say maybe 50% take public transport, the rest will reroute around the zones

* Pricing for different car models/emission types

* What if archives are not available more for download anymore -> Somehow provide a way to manually input data/run the simulation offline

