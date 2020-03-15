import os, traci, pprint

from tracker import Tracker
from listener import StepListener


class SimController:
    def __init__(self, traciConfig, simConfig):
        self.traciConfig = traciConfig
        self.tracker = Tracker(simConfig)
        self.stepListener = StepListener(self.tracker, simConfig)

    def init(self):
        # Add step listener
        traci.addStepListener(self.stepListener)

        # Load data about existing polygons in the simulation
        # Also adds all necessary context subscriptions
        self.tracker.updatePolygons()

    def start(self):
        # Connect
        traci.start(self.traciConfig["sumoCmd"])

        # Initialize call listeners, subscriptions, etc.
        self.init()

        # Run the simulation
        nStep = 0
        while nStep < self.traciConfig["steps"]:
            traci.simulationStep(nStep)
            nStep += 1

        # Finish and clean up
        self.finish()

    def finish(self):
        traci.close()
