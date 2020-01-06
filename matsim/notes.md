# MATSim Output

MATSim demand output is a population described in XML
* The population contains a list of people
* Each person has a **list of different plans**
* Each plan contains a list of *Activities* and *Legs*
* One of these plans is marked as selected

Source: MATSim User Guide

## Current Plan

* Convert Network from MATSim to SUMO Format
    * Use NETCONVERT Tool from SUMO
    * Edges from MATSim should keep the same ID (Important for converting the demand model)
* Parse MATSim Output

