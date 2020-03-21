import os, traci, pprint

from tracker import Tracker
from listener import StepListener


class SimController:
    def __init__(self, traci_config, sim_config):
        self.traci_config = traci_config
        self.tracker = Tracker(sim_config)
        self.step_listener = StepListener(self.tracker, sim_config)

    def __init(self):
        # Add step listener
        traci.addStepListener(self.step_listener)

        # Load data about existing polygons in the simulation
        # Also adds all necessary context subscriptions
        self.tracker.update_polygons()

    def start(self):
        # Connect
        traci.start(self.traci_config["sumo_cmd"])

        # Initialize call listeners, subscriptions, etc.
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
