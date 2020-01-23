import traci
import traci.constants as tc


class StepListener(traci.StepListener):
    def step(self, t):
        # do something at every simulaton step
        print("ExampleListener called at time %s ms." % t)
        # indicate that the step listener should stay active in the next step
        return True


class SimController:
    def __init__(self, config):
        self.config = config

    def init(self):
        # Add step listener
        listener = StepListener()
        traci.addStepListener(listener)

        # Add subscriptions
        traci.vehicle.subscribe("vehicle_0", (tc.VAR_ROAD_ID, tc.VAR_LANEPOSITION))
        traci.polygon.subscribeContext(
            "1", tc.CMD_GET_VEHICLE_VARIABLE, 1000, [tc.VAR_SPEED]
        )

    def start(self):
        # Connect
        traci.start(self.config["sumoCmd"])

        # Initialize call listeners and subscriptions
        self.init()

        # Run the simulation
        nStep = 0
        while nStep < self.config["steps"]:
            self.step(nStep)
            nStep += 1

        # Finish and clean up
        self.finish()

    def step(self, step):
        print("step", step)
        traci.simulationStep()
        # print(traci.vehicle.getSubscriptionResults("vehicle_0"))
        print(traci.polygon.getContextSubscriptionResults("1"))

    def finish(self):
        traci.close()
