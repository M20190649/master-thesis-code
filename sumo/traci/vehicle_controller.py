import pprint, datetime, os
import traci
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc

from logger import log
import rerouting_decisions
import depart_decisions


class VehicleController:
    def __init__(self, sim_config, zone_controller):
        self.sim_config = sim_config
        self.zone_controller = zone_controller
        self.non_depart_people = set()
        self.reroute_people = set()
        self.rerouting_period = 5 * 60
        self.periodic_rerouting_steps = {}  # Used for manual periodic rerouting
        self.new_vehicles = []
        self.vehicle_vars = {}
        self.vehicle_subs = {}
        self.zoneUpdateReroute = False

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event == "zone-update":
            # Do everything that needs to be done after the zones have updated
            if self.sim_config["rerouteOnZoneUpdate"]:
                if not self.sim_config["snapshotZones"]:
                    self.zoneUpdateReroute = True

    def should_vehicle_avoid_polygon(self, vid, polygon):
        # This function can be used to avoid only specific zones/polygons
        # For example an agent is fine with paying for zone 1 but not zone 2 and 3

        pid = polygon["id"]

        # Check the cached list
        polygon_list = traci.vehicle.getParameter(vid, "avoid_polygons")
        if pid in polygon_list.split(","):
            return True

        # Make sure to only consider polygons from the correct timestep
        v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")
        p_timestep = polygon["zone_timestep"]
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
        # Add further logic here

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

        # Check if this person has decided to reroute
        person, counter = vid.split("_")
        if person in self.reroute_people:
            decision = True
            traci.vehicle.setParameter(vid, "rerouting_decision", str(decision))
            return decision

        # Insert more complex logic into rerouting_decisions.py to here to change the 'decision' variable
        if "reroutingDecisionMode" in self.sim_config:
            mode = self.sim_config["reroutingDecisionMode"]
            if mode == "percent":
                if "reroutingPercent" not in self.sim_config:
                    raise ValueError(
                        '"reroutingDecisionMode: percent" requires the configuration key "reroutingPercent"'
                    )
                p = self.sim_config["reroutingPercent"]
                decision = rerouting_decisions.percent(p=p)
            if mode == "random":
                decision = rerouting_decisions.random()

        if decision:
            self.reroute_people.add(person)

        traci.vehicle.setParameter(vid, "rerouting_decision", str(decision))
        return decision

    def has_vehicle_rerouted(self, vid):
        # Check if vehicle has already made a decision if to reroute at all or not
        rerouting_decision = traci.vehicle.getParameter(vid, "rerouting_decision")
        return rerouting_decision != ""

    def reroute_vehicle(self, vid, timestep=None):
        log(f"Rerouting vehicle {vid}")

        traveltime = 999

        do_not_avoid = []

        # Decide per polygon if to avoid it or not
        polygons = self.zone_controller.get_polygons_by_timestep(timestep=timestep)
        for polygon in polygons:
            # Handle holes
            if polygon["id"].startswith("hole"):
                if polygon["type"] == "empty-hole":
                    do_not_avoid.append(polygon)

                continue

            # Handle regular zone polygons
            if self.should_vehicle_avoid_polygon(vid, polygon):
                for eid in polygon["edges"]:
                    # Set travel times for all edges to very high value
                    # More polluted zones get a higher traveltime
                    t = float(traveltime * (polygon["zone"] ** 2))
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=t)
            else:
                do_not_avoid.append(polygon)

        for polygon in do_not_avoid:
            # Make sure holes and other polygons that should not be avoided have 0 traveltime
            # Do this step separately after the loop above because SUMO can't deal with polygons that have holes
            # This basically partially overwrites some weights set above because polygons are layered
            for eid in polygon["edges"]:
                traci.vehicle.setAdaptedTraveltime(vid, eid, time=0)

        traci.vehicle.rerouteTraveltime(vid, False)

        old_route = self.vehicle_vars[vid][tc.VAR_EDGES]
        new_route = traci.vehicle.getRoute(vid)

        if old_route == new_route:
            log("Route has not changed")
            traci.vehicle.setColor(vid, (0, 0, 255))
        else:
            traci.vehicle.setColor(vid, (255, 0, 0))

        # Disable rerouting through the rerouting device so that vehicle will stay on this route
        if self.sim_config["periodicRerouting"]:
            # Turn off periodic rerouting through the device because
            # it does not consider the vehicle-specific edge travel times
            traci.vehicle.setParameter(vid, "device.rerouting.period", "0")
            # Add vehicle to manual periodic rerouting list
            # Do manual periodic rerouting every 5 minutes
            self.periodic_rerouting_steps[vid] = (
                traci.simulation.getTime() + self.rerouting_period
            )

    def static_rerouting(self, zone_update=False):
        vehicleToCheck = []
        if zone_update:
            # Only executed when rerouteOnZoneUpdate is true
            # Zones have updated so we want to check all vehicles, not only the new ones
            vehicleToCheck = traci.vehicle.getIDList()
        else:
            # Only check the new ones
            vehicleToCheck = self.new_vehicles

        # Rerouting for vehicles whose route crosses through air quality zones
        for vid in vehicleToCheck:
            route = self.vehicle_vars[vid][tc.VAR_EDGES]
            current_route_index = self.vehicle_vars[vid][tc.VAR_ROUTE_INDEX]
            upcoming_edges = route[current_route_index:]

            # Check if route includes edges that are within air quality zone polygons of current timestep
            for polygon in self.zone_controller.get_polygons_by_timestep(holes=False):
                pid = polygon["id"]
                polygon_edges = polygon["edges"]

                intersecting_edges = list(set(upcoming_edges) & set(polygon_edges))
                n_intersect = len(intersecting_edges)
                if n_intersect != 0:
                    if not self.should_vehicle_reroute(vid):
                        break

                    if upcoming_edges[0] in polygon_edges:
                        if zone_update:
                            log(
                                f"Vehicle {vid} was inside polygon {pid} during zone update"
                            )
                        else:
                            log(f"New vehicle {vid} was inserted inside polygon {pid}")

                    log_msg = f"Vehicle {vid} route intersects with zone polygon {pid} "
                    if n_intersect > 1:
                        log_msg += (
                            f"(edge {intersecting_edges[0]} and {n_intersect - 1} more)"
                        )
                    else:
                        log_msg += f"(edge {intersecting_edges[0]})"
                    log(log_msg)

                    # Check for special case where destination is inside a zone
                    if upcoming_edges[-1] in polygon_edges:
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
            vehicleToCheck = self.new_vehicles

        # Check all the newly spawned vehicles if any of them are located within the zone
        for vid in vehicleToCheck:
            route = self.vehicle_vars[vid][tc.VAR_EDGES]
            route_index = self.vehicle_vars[vid][tc.VAR_ROUTE_INDEX]
            current_edge = route[route_index]

            # Check if starting edge is within any of the polygons
            for polygon in self.zone_controller.get_polygons_by_timestep(holes=False):
                pid = polygon["id"]
                polygon_edges = polygon["edges"]
                if current_edge in polygon_edges:
                    if zone_update:
                        log(
                            f"Vehicle {vid} was inside polygon {pid} during zone update"
                        )
                    else:
                        log(f"New vehicle {vid} was inserted inside polygon {pid}")

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

        polygon_ids = self.zone_controller.get_polygon_ids()

        # 2. Check if any vehicles are within dynamicReroutingDistance to any polygon
        # Vehicle subs contain all vehicles that have a polygon within dynamicReroutingDistance
        for vid in self.vehicle_subs:
            if not zone_update:
                if self.has_vehicle_rerouted(vid):
                    # When vehicle has already rerouted we don't want it to reroute again
                    continue

            vehicle = self.vehicle_vars[vid]
            route = vehicle[tc.VAR_EDGES]
            current_route_index = vehicle[tc.VAR_ROUTE_INDEX]
            upcoming_edges = route[current_route_index:]
            v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")

            # Loop through all polygons within dynamicReroutingDistance
            # Check if any of the upcoming edges intersect with any of the polygons
            polygons = self.vehicle_subs[vid]
            for pid in polygons:
                if pid.startswith("hole"):
                    continue

                if pid not in polygon_ids:
                    # Skip possibly removed polygons
                    continue

                polygon = self.zone_controller.get_polygon(pid)
                p_timestep = polygon["zone_timestep"]
                polygon_edges = polygon["edges"]

                if self.sim_config["snapshotZones"]:
                    # When zones are frozen only consider the polygons that existed at the time when the vehicle was inserted
                    if p_timestep != v_timestep:
                        continue
                else:
                    # When zones are NOT frozen only consider the most recent polygons
                    if p_timestep != self.zone_controller.current_timestep:
                        continue

                # Check if any edge of vehicle route goes through polygon
                intersecting_edges = list(set(upcoming_edges) & set(polygon_edges))
                n_intersect = len(intersecting_edges)
                if n_intersect != 0:
                    # Make decision if to reroute at all
                    if not self.should_vehicle_reroute(vid):
                        continue

                    log_msg = f"Vehicle {vid} route intersects with zone polygon {pid} "
                    if n_intersect > 1:
                        log_msg += (
                            f"(edge {intersecting_edges[0]} and {n_intersect - 1} more)"
                        )
                    else:
                        log_msg += f"(edge {intersecting_edges[0]})"
                    log(log_msg)

                    # Check if destination is within polygon
                    if upcoming_edges[-1] in polygon_edges:
                        # TODO: What to do in the case that the destination is inside a zone?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        log(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid, timestep=p_timestep)

    def should_vehicle_depart(self, vid):
        decision = True
        if "nonDepartDecisionMode" in self.sim_config:
            mode = self.sim_config["nonDepartDecisionMode"]
            if mode == "percent":
                if "nonDepartPercent" not in self.sim_config:
                    raise ValueError(
                        '"nonDepartDecisionMode: percent" requires the configuration key "nonDepartPercent"'
                    )
                p = 1 - self.sim_config["nonDepartPercent"]
                decision = depart_decisions.percent(p=p)
            if mode == "random":
                decision = depart_decisions.random()

        return decision

    def prepare_new_vehicles(self):
        # This implementation for non-depart requires
        # adding "step < 24 * 60 * 60" to the while condition in simulation_controller
        loaded_vehicles = traci.simulation.getLoadedIDList()
        self.new_vehicles = traci.simulation.getDepartedIDList()
        for vid in loaded_vehicles:
            person, counter = vid.split("_")
            if person in self.non_depart_people:
                traci.vehicle.remove(vid)
                log(f"Remove vehicle {vid} due to non-depart")
                continue

            if not self.should_vehicle_depart(vid):
                traci.vehicle.remove(vid)
                log(f"Remove vehicle {vid} due to non-depart")
                self.non_depart_people.add(person)

        # Alternative implementation for the non-depart
        # Problem: Removed vehicles have already departed and will still show up in the output files
        # departed_vehicles = traci.simulation.getDepartedIDList()
        # self.new_vehicles = []
        # for vid in departed_vehicles:
        #     person, counter = vid.split("_")
        #     if person in self.non_depart_people:
        #         traci.vehicle.remove(vid)
        #         log(f"Remove vehicle {vid} due to non-depart")
        #         continue

        #     if not should_vehicle_depart():
        #         traci.vehicle.remove(vid)
        #         log(f"Remove vehicle {vid} due to non-depart")
        #         self.non_depart_people.add(person)
        #     else:
        #         self.new_vehicles.append(vid)

        for vid in self.new_vehicles:
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

    def clean_up_vehicles(self):
        arrived_vehicles = traci.simulation.getArrivedIDList()
        for vid in arrived_vehicles:
            if vid in self.periodic_rerouting_steps:
                del self.periodic_rerouting_steps[vid]

    def reroute(self):
        # Get subscriptions
        self.vehicle_vars = traci.vehicle.getAllSubscriptionResults()
        self.vehicle_subs = traci.vehicle.getAllContextSubscriptionResults()

        if self.sim_config["zoneRerouting"] == "static":
            self.static_rerouting(zone_update=self.zoneUpdateReroute)
        elif self.sim_config["zoneRerouting"] == "dynamic":
            self.dynamic_rerouting(zone_update=self.zoneUpdateReroute)
        else:
            raise ValueError("Unknown zoneRerouting value")

        if self.sim_config["periodicRerouting"]:
            # Check if any previously rerouted vehicle needs their route to be periodically re-checked
            current_time = traci.simulation.getTime()
            for vid in self.periodic_rerouting_steps:
                step = self.periodic_rerouting_steps[vid]
                if current_time == step:
                    # If rerouting period has passed reroute again to make sure
                    # the vehicle is on the optimal route
                    traci.vehicle.rerouteTraveltime(vid, False)
                    self.periodic_rerouting_steps[vid] = (
                        current_time + self.rerouting_period
                    )

        if self.zoneUpdateReroute:
            self.zoneUpdateReroute = False
