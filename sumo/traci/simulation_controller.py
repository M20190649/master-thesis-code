import os, traci, pprint

from tracker import Tracker
from vehicle_controller import VehicleController
from zone_controller import ZoneController


class SimulationController:
    def __init__(self, traci_config, sim_config):
        self.traci_config = traci_config
        self.zone_controller = ZoneController(sim_config)
        self.tracker = Tracker(sim_config, self.zone_controller)
        self.vehicle_controller = VehicleController(sim_config, self.zone_controller)

    def __init(self):
        # Step listeners are always executed AFTER the simulation step (traci.simulationStep())
        # Adding tracker first because we want to track the vehicle movement in the previous step
        traci.addStepListener(self.tracker)
        # Then add the zone manager to check if the zones need to be updated
        traci.addStepListener(self.zone_controller)
        # After zones were checked and possibly adjusted we want to reroute the vehicles if necessary
        traci.addStepListener(self.vehicle_controller)

        # Load initial zones
        self.zone_controller.load_polygons(0)

    def start(self):
        # Connect
        traci.start(self.traci_config["sumo_cmd"])

        # Add step listeners, subscriptions, etc.
        self.__init()

        # Run the simulation
        step = 0
        while traci.simulation.getMinExpectedNumber() > 0:
            traci.simulationStep(step)
            step += 1

        # Finish and clean up
        print(f"Finished at step {step}")
        self.__finish()

    def __finish(self):
        traci.close()
