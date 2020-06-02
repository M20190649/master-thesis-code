import os, pprint, time, sys
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

        # Load initial zones
        self.zone_controller.update_zones(0)

        # Prepare initial vehicles
        self.vehicle_controller.prepare_new_vehicles()

        interval = self.sim_config["zoneUpdateInterval"] * 60

        t = time.time()
        step_time = 0
        prep_time = 0
        tracking_time = 0
        rerouting_time = 0

        # Run the simulation
        step = 0
        while step < 24 * 60 * 60 or traci.simulation.getMinExpectedNumber() > 0:
            # log(f"Before step {step}")
            x = time.time()
            traci.simulationStep(step)
            step_time += time.time() - x
            # log(f"After step {step}")

            x = time.time()
            self.vehicle_controller.prepare_new_vehicles()
            prep_time += time.time() - x
            # log(f"After new vehicle prep")

            x = time.time()
            self.tracker.track_vehicles_in_polygons(step)
            tracking_time += time.time() - x
            # log(f"After tracking")

            if step > 0 and step % interval == 0:
                prev_timestep = self.zone_controller.get_timestep_from_step(
                    step - interval
                )
                curr_timestep = self.zone_controller.get_timestep_from_step(step)
                log(
                    f"\nPrevious timestep ({prev_timestep} - {curr_timestep}) simulation time: {format(time.time() - t, '.3f')}s"
                )
                log(f"Simulation step time: {format(step_time, '.3f')}s")
                log(f"Vehicle preparation time: {format(prep_time, '.3f')}s")
                log(f"Vehicle tracking time: {format(tracking_time, '.3f')}s")
                log(f"Vehicle rerouting time: {format(rerouting_time, '.3f')}s")
                log()
                t = time.time()
                step_time = 0
                prep_time = 0
                tracking_time = 0
                rerouting_time = 0
                # if step == interval * 4:
                #     sys.exit()

                self.zone_controller.update_zones(step)
                # log(f"After zone update")

            if self.sim_config["zoneRerouting"] != "none":
                x = time.time()
                self.vehicle_controller.reroute()
                rerouting_time += time.time() - x
                # log(f"After reroute")

            step += 1

        # Finish and clean up
        log(f"Finished at step {step}")
        self.__finish()

    def __finish(self):
        self.tracker.finish()
        traci.close()
