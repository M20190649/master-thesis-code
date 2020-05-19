import traci, pprint, datetime, os
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd

from logger import log
import rerouting_decisions


class VehicleController(traci.StepListener):
    def __init__(self, sim_config, zone_controller):
        self.sim_config = sim_config
        self.zone_controller = zone_controller
        self.rerouted_vehicles = []
        self.newly_inserted_vehicles = []
        self.vehicle_vars = {}
        self.vehicle_polygons = {}
        self.polygon_subs = {}
        self.zoneUpdateReroute = False

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event == "zone-update":
            # Do everything that needs to be done after the zones have updated
            if self.sim_config["rerouteOnZoneUpdate"]:
                if not self.sim_config["snapshotZones"]:
                    self.zoneUpdateReroute = True

    def should_vehicle_avoid_polygon(self, vid, pid):
        # This function can be used to avoid only specific zones/polygons
        # For example an agent is fine with paying for zone 1 but not zone 2 and 3

        # Don't avoid any holes
        if pid.startswith("hole"):
            return False

        # Check the cached list
        polygon_list = traci.vehicle.getParameter(vid, "avoid_polygons")
        if pid in polygon_list.split(","):
            return True

        v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")
        p_timestep = traci.polygon.getParameter(pid, "zone_timestep")
        if self.sim_config["snapshotZones"]:
            # When zones are frozen only consider the polygons that existed at the time when the vehicle was inserted
            if p_timestep != v_timestep:
                return False
        else:
            # When zones are NOT frozen only consider the most recent polygons
            if p_timestep != self.zone_controller.current_timestep:
                return False

        avoid = True

        # FUTURE WORK

        # Cache the list of polygons that should be avoided
        if avoid:
            polygon_list = traci.vehicle.getParameter(vid, "avoid_polygons")
            polygon_list += f"{pid},"
            traci.vehicle.setParameter(vid, "avoid_polygons", polygon_list)

        return avoid

    def should_vehicle_reroute(self, vid):
        # This function can be arbitrarily complex to decide if a vehicle should be rerouted
        # Example: Use demographic data, price sensitivity, route length, vehicle type, random etc.

        # Check if vehicle has already made a decision
        rerouting_decision = traci.vehicle.getParameter(vid, "rerouting_decision")
        if rerouting_decision != "":
            return rerouting_decision == "True"

        decision = True

        # Insert more complex logic into rerouting_decisions.py to here to change the 'decision' variable
        if "reroutingDecisionMode" in self.sim_config:
            mode = self.sim_config["reroutingDecisionMode"]
            if mode == "percentage":
                p = self.sim_config["reroutingPercentage"]
                decision = rerouting_decisions.percentage(p=p)
            if mode == "random":
                decision = rerouting_decisions.random()

        traci.vehicle.setParameter(vid, "rerouting_decision", str(decision))

        return decision

    def has_vehicle_rerouted(self, vid):
        # Check if vehicle has already made a decision if to reroute at all or not
        rerouting_decision = traci.vehicle.getParameter(vid, "rerouting_decision")
        return rerouting_decision != ""

    def reroute_vehicle(self, vid, timestep=None):
        log(f"Rerouting vehicle {vid}")

        traveltime = 99999999

        # Decide per polygon if to avoid it or not
        for pid in self.zone_controller.get_polygons_by_timestep(
            timestep=timestep, holes=False
        ):
            if self.should_vehicle_avoid_polygon(vid, pid):
                polygon_edges = self.zone_controller.get_polygon_edges(pid=pid)
                for eid in polygon_edges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=traveltime)

        traci.vehicle.rerouteTraveltime(vid, False)
        traci.vehicle.setColor(vid, (255, 0, 0))
        # Disable rerouting through the rerouting device so that vehicle will stay on this route
        traci.vehicle.setParameter(vid, "device.rerouting.period", "0")

    def static_rerouting(self, zone_update=False):
        vehicleToCheck = []
        if zone_update:
            # Only executed when rerouteOnZoneUpdate is true
            # Zones have updated so we want to check all vehicles, not only the new ones
            vehicleToCheck = traci.vehicle.getIDList()
        else:
            # Only check the new ones
            vehicleToCheck = self.newly_inserted_vehicles

        # Rerouting for vehicles whose route crosses through air quality zones
        for vid in vehicleToCheck:
            route = self.vehicle_vars[vid][tc.VAR_EDGES]

            # Check if route includes edges that are within air quality zone polygons of current timestep
            for pid in self.zone_controller.get_polygons_by_timestep(holes=False):
                polygon_edges = self.zone_controller.get_polygon_edges(pid=pid)

                if any(eid in polygon_edges for eid in route):
                    if not self.should_vehicle_reroute(vid):
                        break

                    # Check for special case where destination is inside a zone
                    if route[-1] in polygon_edges:
                        # TODO: What to do?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        log(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid)
                    break

    def dynamic_rerouting(self, zone_update=False):
        # 1. Check for new/all vehicles if current edge is within one of the polygons
        vehicleToCheck = []
        if zone_update:
            # Zones have updated so we want to check all vehicles, not only the new ones
            vehicleToCheck = traci.vehicle.getIDList()
        else:
            # Only check the new ones
            vehicleToCheck = self.newly_inserted_vehicles

        # Check all the newly spawned vehicles if any of them are located within the zone
        for vid in vehicleToCheck:
            route = self.vehicle_vars[vid][tc.VAR_EDGES]
            route_index = self.vehicle_vars[vid][tc.VAR_ROUTE_INDEX]
            current_edge = route[route_index]

            # Check if starting edge is within any of the polygons
            for pid in self.zone_controller.get_polygons_by_timestep(holes=False):
                polygon_edges = self.zone_controller.get_polygon_edges(pid=pid)
                if current_edge in polygon_edges:
                    log(f"New vehicle {vid} was inserted inside polygon {pid}.")
                    # Make decision if to reroute at all
                    if not self.should_vehicle_reroute(vid):
                        break

                    # Check for special case where destination is inside a zone
                    if route[-1] in polygon_edges:
                        # TODO: What to do?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        log(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid)
                    break

        # 2. Check for all vehicles that are within the dynamic rerouting range
        # if any of their upcoming edges are within any of the polygons

        # Go through all polygons and get all vehicles within dynamic rerouting range
        vehicle_ids = traci.vehicle.getIDList()
        polygon_ids = traci.polygon.getIDList()
        for pid in self.polygon_subs:
            if pid.startswith("hole"):
                continue

            if pid not in polygon_ids:
                # Skip possibly removed polygons
                continue

            p_timestep = traci.polygon.getParameter(pid, "zone_timestep")
            polygon_context = self.polygon_subs[pid]
            vehicle_context = {
                k: v for (k, v) in polygon_context.items() if k in vehicle_ids
            }
            polygon_edges = self.zone_controller.get_polygon_edges(pid=pid)

            for vid in vehicle_context:
                if not zone_update:
                    if self.has_vehicle_rerouted(vid):
                        # When vehicle has already rerouted we don't want it to reroute again
                        continue

                v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")
                if self.sim_config["snapshotZones"]:
                    # When zones are frozen only consider the polygons that existed at the time when the vehicle was inserted
                    if p_timestep != v_timestep:
                        continue
                else:
                    # When zones are NOT frozen only consider the most recent polygons
                    if p_timestep != self.zone_controller.current_timestep:
                        continue

                route = self.vehicle_vars[vid][tc.VAR_EDGES]
                current_route_index = self.vehicle_vars[vid][tc.VAR_ROUTE_INDEX]
                upcoming_edges = route[current_route_index:]

                # Check if any edge of vehicle route goes through polygon
                if any(eid in polygon_edges for eid in upcoming_edges):
                    # Make decision if to reroute at all
                    if not self.should_vehicle_reroute(vid):
                        continue

                    # Check if destination is within polygon
                    if upcoming_edges[-1] in polygon_edges:
                        # TODO: What to do in the case that the destination is inside a zone?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        log(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid, timestep=p_timestep)

    def prepare_new_vehicles(self):
        # n_new = len(self.newly_inserted_vehicles)
        # if n_new != 0:
        #     print(f"{n_new} new vehicle{'' if n_new == 1 else 's'} {'was' if n_new == 1 else 'were'} inserted")

        for vid in self.newly_inserted_vehicles:
            # Store the timestep when a vehicle was inserted into the simulation
            traci.vehicle.setParameter(
                vid, "zone_timestep", self.zone_controller.current_timestep
            )
            traci.vehicle.subscribe(
                vid,
                [
                    tc.VAR_POSITION,  # Used to check if vehicles are inside a zones
                    tc.VAR_SPEED,  # Used to track vehicle distances in the zones
                    tc.VAR_EDGES,  # Used to check if the route passes through zones
                    tc.VAR_ROUTE_INDEX,  # Vehicles that have their destination within the zone shouldn't be rerouted
                    tc.VAR_EMISSIONCLASS,  # Used to distinguish between gas, electric and other car types
                ],
            )
            traci.vehicle.subscribeContext(
                vid,
                tc.CMD_GET_POLYGON_VARIABLE,
                self.sim_config["dynamicReroutingDistance"],
                [tc.ID_COUNT],
            )

    def reroute(self, zone_update=False):
        if self.sim_config["zoneRerouting"] == "static":
            self.static_rerouting(zone_update)
        elif self.sim_config["zoneRerouting"] == "dynamic":
            self.dynamic_rerouting(zone_update)
        else:
            raise ValueError("Unknown zoneRerouting value")

    def step(self, t):
        # Do something at every simulaton step

        # Prepare new vehicles
        simulation_sub = traci.simulation.getSubscriptionResults()
        self.newly_inserted_vehicles = simulation_sub[tc.VAR_DEPARTED_VEHICLES_IDS]
        self.prepare_new_vehicles()

        # Get subscriptions
        self.vehicle_vars = traci.vehicle.getAllSubscriptionResults()
        self.vehicle_polygons = traci.vehicle.getAllContextSubscriptionResults()
        self.polygon_subs = traci.polygon.getAllContextSubscriptionResults()

        # log(self.vehicle_polygons)

        if self.sim_config["zoneRerouting"] != "none":
            if self.zoneUpdateReroute:
                self.reroute(zone_update=True)
                self.zoneUpdateReroute = False
            else:
                self.reroute(zone_update=False)

        # Return true to indicate that the step listener should stay active in the next step
        return True
