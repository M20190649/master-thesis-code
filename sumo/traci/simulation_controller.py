import os, traci, pprint

from tracker import Tracker
from rerouter import Rerouter
from zone_manager import ZoneManager


class SimulationController:
    def __init__(self, traci_config, sim_config):
        self.traci_config = traci_config
        self.zone_manager = ZoneManager(sim_config)
        self.tracker = Tracker(sim_config)
        self.rerouter = Rerouter(sim_config)

    def __init(self):
        # Step listeners are always executed AFTER the simulation step (traci.simulationStep())
        # Adding tracker first because we want to track the vehicle movement in the previous step
        traci.addStepListener(self.tracker)
        # Then add the zone manager to check if the zones need to be updated
        traci.addStepListener(self.zone_manager)
        # After zones were checked and possibly adjusted we want to reroute the vehicles if necessary
        traci.addStepListener(self.rerouter)

        # Load initial zones
        self.zone_manager.load_polygons(0)

    def start(self):
        # Connect
        traci.start(self.traci_config["sumo_cmd"])

        # Add step listeners, subscriptions, etc.
        self.__init()

        # Run the simulation
        step = 0
        while step < self.traci_config["steps"]:
            traci.simulationStep(step)
            step += 1

        # Finish and clean up
        self.__finish()

    def __finish(self):
        traci.close()
