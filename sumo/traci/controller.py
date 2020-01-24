import traci
import traci.constants as tc

from listener import StepListener


class SimController:
    def __init__(self, config):
        self.config = config

    def init(self):
        # Add step listener
        listener = StepListener()
        traci.addStepListener(listener)

        # Add subscriptions
        # traci.vehicle.subscribe("vehicle_0", (tc.VAR_ROAD_ID, tc.VAR_LANEPOSITION))
        # traci.polygon.subscribeContext(
        #     "1",
        #     tc.CMD_GET_VEHICLE_VARIABLE,
        #     10,
        #     [tc.VAR_EDGES, tc.VAR_ROUTING_MODE, tc.VAR_ROUTE_INDEX],
        # )

    def start(self):
        # Connect
        traci.start(self.config["sumoCmd"])

        # Initialize call listeners and subscriptions
        self.init()

        # Run the simulation
        nStep = 0
        while nStep < self.config["steps"]:
            print("step", nStep)
            traci.simulationStep()
            nStep += 1

        # Finish and clean up
        self.finish()

    def finish(self):
        traci.close()
