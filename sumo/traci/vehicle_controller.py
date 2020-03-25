import traci, pprint, datetime, os
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd

import rerouting_decisions


class VehicleController(traci.StepListener):
    def __init__(self, sim_config, zone_manager):
        self.sim_config = sim_config
        self.zone_manager = zone_manager
        self.rerouted_vehicles = []
        self.newly_inserted_vehicles = []

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event == "zone-update":
            # Do everything that needs to be done after the zones have updated
            # TODO: Do rerouting again after zones have changed?
            pass

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

        v_timestep = traci.vehicle.getParameter(vid, "timestep")
        p_timestep = traci.polygon.getParameter(pid, "timestep")
        if v_timestep != p_timestep:
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
        decision = rerouting_decisions.percentage(vid, 0.05)

        traci.vehicle.setParameter(vid, "rerouting_decision", str(decision))

        return decision

    def reroute_vehicle(self, vid, timestep=None):
        print(f"Rerouting vehicle {vid}")

        traveltime = 99999999

        # Decide per polygon if to avoid it or not
        for pid in self.zone_manager.get_polygons_by_timestep(timestep=timestep, holes=False):
            if self.should_vehicle_avoid_polygon(vid, pid):
                polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)
                for eid in polygon_edges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=traveltime)

        traci.vehicle.rerouteTraveltime(vid, False)
        traci.vehicle.setColor(vid, (255, 0, 0))

    def static_rerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        vehicle_subs = traci.vehicle.getAllSubscriptionResults()
        for vid in self.newly_inserted_vehicles:
            route = vehicle_subs[vid][tc.VAR_EDGES]

            # Check if route includes edges that are within air quality zone polygons of current timestep
            for pid in self.zone_manager.get_polygons_by_timestep(holes=False):
                polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)

                if any(eid in polygon_edges for eid in route):
                    if not self.should_vehicle_reroute(vid):
                        break

                    # Check for special case where destination is inside a zone
                    if route[-1] in polygon_edges:
                        # TODO: What to do?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        print(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid)
                    break

    def dynamic_rerouting(self):
        # Check all the newly spawned vehicles if any of them are located within the zone
        vehicle_subs = traci.vehicle.getAllSubscriptionResults()
        for vid in self.newly_inserted_vehicles:
            route = vehicle_subs[vid][tc.VAR_EDGES]

            # Check if starting edge is within any of the polygons
            for pid in self.zone_manager.get_polygons_by_timestep(holes=False):
                polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)
                if route[0] in polygon_edges:
                    print(f"New vehicle {vid} was inserted inside polygon {pid}.")
                    # Make decision if to reroute at all
                    if not self.should_vehicle_reroute(vid):
                        break

                    # Check for special case where destination is inside a zone
                    if route[-1] in polygon_edges:
                        # TODO: What to do?
                        # Don't reroute at all? Or maybe find the "cheapest" way to destination?
                        print(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid)
                    break

        # Go through all polygons and get all vehicles within dynamic rerouting range
        polygon_subs = traci.polygon.getAllContextSubscriptionResults()
        vehicle_ids = traci.vehicle.getIDList()
        for pid in polygon_subs:
            if pid.startswith("hole"):
                continue

            p_timestep = pid.split("_")[1]
            polygon_context = polygon_subs[pid]
            vehicle_context = {
                k: v for (k, v) in polygon_context.items() if k in vehicle_ids
            }
            polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)

            for vid in vehicle_context:
                # Check if vehicle has already made a decision if to reroute at all or not
                rerouting_decision = traci.vehicle.getParameter(vid, "rerouting_decision")
                if rerouting_decision != "":
                    continue

                v_timestep = traci.vehicle.getParameter(vid, "timestep")
                if self.sim_config["freezeZones"]:
                    # When zones are frozen only consider the polygons that existed at the time when the vehicle was inserted
                    if p_timestep != v_timestep:
                        continue
                else:
                    # When zones are NOT frozen only consider the most recent polygons
                    if p_timestep != self.zone_manager.current_timestep:
                        continue

                route = vehicle_subs[vid][tc.VAR_EDGES]
                current_route_index = vehicle_subs[vid][tc.VAR_ROUTE_INDEX]
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
                        print(f"Destination of vehicle {vid} is in polygon {pid}")

                    self.reroute_vehicle(vid, timestep=p_timestep)

    def prepare_new_vehicles(self):
        n_new = len(self.newly_inserted_vehicles)
        if n_new != 0:
            print(f"{n_new} new vehicle{'' if n_new == 1 else 's'} {'was' if n_new == 1 else 'were'} inserted")
        
        for vid in self.newly_inserted_vehicles:
            # Store the timestep when a vehicle was inserted into the simulation
            traci.vehicle.setParameter(vid, "timestep", self.zone_manager.current_timestep)
            traci.vehicle.subscribe(vid, [
                tc.VAR_POSITION, # Used to check if vehicles are inside a zones
                tc.VAR_SPEED, # Used to track vehicle distances in the zones
                tc.VAR_EDGES, # Used to check if the route passes through zones
                tc.VAR_ROUTE_INDEX, # Vehicles that have their destination within the zone shouldn't be rerouted
                tc.VAR_EMISSIONCLASS, # Used to distinguish between gas, electric and other car types
            ])

    def reroute(self):
        if self.sim_config["enableRerouting"]:
            if self.sim_config["dynamicRerouting"]:
                self.dynamic_rerouting()
            else:
                self.static_rerouting()

    def step(self, t):
        # Do something at every simulaton step

        # Get subscriptions
        simulation_sub = traci.simulation.getSubscriptionResults()
        self.newly_inserted_vehicles = simulation_sub[tc.VAR_DEPARTED_VEHICLES_IDS]

        self.prepare_new_vehicles()

        self.reroute()

        # Return true to indicate that the step listener should stay active in the next step
        return True
