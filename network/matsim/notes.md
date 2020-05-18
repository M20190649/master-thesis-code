# MATSim Output

MATSim demand output is a population described in XML
* The population contains a list of people
* Each person has a **list of different plans**
* Each plan contains a list of *Activities* and *Legs*
* One of these plans is marked as selected

Source: MATSim User Guide

## Options for converting MATSim Berlin Scenario Plans to SUMO Demand Model
* Manual conversion
    * Probably forces me to convert the network from MATSim so that the *edge IDs* stay the same (they are used in the output plans!)
    * SUMO vehicle consists of three parts:
        * vehicle type -> describes physical properties (not mandatory, default type is used)
        * a route which the vehicle takes (mandatory)
        * the vehicle itself (mandatory)
        * routes and vehicle types can be shared by multiple vehicles
        * people walking or riding in vehicles need further specification
        * Source: https://sumo.dlr.de/docs/Definition_of_Vehicles,_Vehicle_Types,_and_Routes.html
    * 1 vehicle per person from MATSim output
    * Maybe define multiple vehicle types for SUMO and assign each person to one of them
    * Take all `<leg>` tags with the attribute `mode="car"` from MATSim output and generate a `<route>` tag for SUMO
    * Edges are taken from MATSim output *link IDs*
    * `dep_time` from MATSim can be used the determine the vehicles `depart` attribute for SUMO

```xml
<!-- MATSIM <leg> -->
<leg mode="car" dep_time="09:23:50">
    <route type="links" start_link="144395" end_link="134075" trav_time="00:09:34" distance="7483.395897460802" vehicleRefId="10000001">144395 13185 110920 110771 110773 13324 110367 110369 143404 98098 143528 111248 111278 111280 143420 143410 131204 133161 13679 93161 26733 26730 46537 41913 134075</route>
</leg>

<!-- SUMO <route> -->
<route id="route0" color="1,1,0" edges="144395 13185 110920 110771 110773 13324 110367 110369 143404 98098 143528 111248 111278 111280 143420 143410 131204 133161 13679 93161 26733 26730 46537 41913 134075"/>
```

## Current Plan

* Convert Network from MATSim to SUMO Format
    * Use NETCONVERT Tool from SUMO
    * Edges from MATSim should keep the same ID (Important for converting the demand model)
* Parse MATSim Output

