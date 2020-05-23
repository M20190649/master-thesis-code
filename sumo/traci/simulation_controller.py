import os, pprint
import traci
import traci.constants as tc
from tracker import Tracker
from vehicle_controller import VehicleController
from zone_controller import ZoneController
from logger import log


class SimulationController:
    def __init__(self, traci_config, sim_config):
        self.traci_config = traci_config
        self.sim_config = sim_config
        self.zone_controller = ZoneController(sim_config)
        self.tracker = Tracker(sim_config, self.zone_controller)
        self.vehicle_controller = VehicleController(sim_config, self.zone_controller)

    def start(self):
        # Connect
        traci.start(self.traci_config["sumo_cmd"])

        # We need the ID list of departed vehicles every step so we add a subscription
        traci.simulation.subscribe(
            [tc.VAR_LOADED_VEHICLES_IDS, tc.VAR_DEPARTED_VEHICLES_IDS]
        )

        # Load initial zones
        self.zone_controller.load_polygons(0)

        # Prepare initial vehicles
        self.vehicle_controller.prepare_new_vehicles()

        interval = self.sim_config["zoneUpdateInterval"] * 60

        # Run the simulation
        step = 0
        while traci.simulation.getMinExpectedNumber() > 0:
            # log(f"Before step {step}")
            traci.simulationStep(step)
            # log(f"After step {step}")
            self.vehicle_controller.prepare_new_vehicles()
            # log(f"After new vehicle prep")

            self.tracker.track_vehicles_in_polygons(step)
            # log(f"After tracking")

            if step > 0 and step % interval == 0:
                self.zone_controller.update_zones(step)
                # log(f"After zone update")

            if self.sim_config["zoneRerouting"] != "none":
                self.vehicle_controller.reroute()
                # log(f"After reroute")

            step += 1

        # Finish and clean up
        log(f"Finished at step {step}")
        self.__finish()

    def __finish(self):
        self.tracker.finish()
        traci.close()
