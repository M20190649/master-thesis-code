import traci, pprint, datetime, os
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd


class Rerouter(traci.StepListener):
    def __init__(self, sim_config, zone_manager):
        self.sim_config = sim_config
        self.zone_manager = zone_manager
        self.rerouted_vehicles = []

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

        if pid.startswith("hole"):
            return False

        avoid = True

        v_timestep = traci.vehicle.getParameter(vid, "timestep")
        p_timestep = traci.polygon.getParameter(pid, "timestep")
        print(v_timestep, p_timestep, v_timestep != p_timestep)
        if v_timestep != p_timestep:
            return False

        # FUTURE WORK

        return avoid

    def should_vehicle_reroute(self, vid):
        # This function can be arbitrarily complex to decide if a vehicle should be rerouted
        # Example: Use demographic data, price sensitivity, route length, vehicle type, random etc.

        # Check if vehicle has already made a decision
        rerouting_decision = traci.vehicle.getParameter(vid, "rerouting_decision")
        if rerouting_decision != "":
            return rerouting_decision == "True"

        decision = True

        # Insert more complex logic here to change the 'decision' variable

        traci.vehicle.setParameter(vid, "rerouting_decision", str(decision))

        return decision

    def reroute_vehicle(self, vid):
        print(f"Rerouting vehicle {vid}")

        traveltime = 99999999

        # Decide per polygon if to avoid it or not
        for pid in traci.polygon.getIDList():
            if self.should_vehicle_avoid_polygon(vid, pid):
                polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)
                for eid in polygon_edges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=traveltime)

        traci.vehicle.rerouteTraveltime(vid, False)

        traci.vehicle.setParameter(vid, "is_rerouted", str(True))
        traci.vehicle.setColor(vid, (255, 0, 0))

    def static_rerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for vid in newly_inserted_vehicles:
            route = traci.vehicle.getRoute(vid)

            # Check if route includes edges that are within air quality zone polygons
            for pid in traci.polygon.getIDList():
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
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for vid in newly_inserted_vehicles:
            route = traci.vehicle.getRoute(vid)

            # Check if starting edge is within any of the polygons
            for pid in traci.polygon.getIDList():
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
        for pid in traci.polygon.getIDList():
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            if polygon_context is None:
                continue

            vehicle_ids = traci.vehicle.getIDList()
            vehicle_context = {
                k: v for (k, v) in polygon_context.items() if k in vehicle_ids
            }
            polygon_edges = self.zone_manager.get_polygon_edges(pid=pid)

            for vid in vehicle_context:
                is_rerouted = traci.vehicle.getParameter(vid, "is_rerouted")
                if is_rerouted == "True":
                    # Don't reroute vehicles that already have been rerouted
                    continue

                vehicle_data = vehicle_context[vid]
                route = traci.vehicle.getRoute(vid)
                upcoming_edges = route[vehicle_data[tc.VAR_ROUTE_INDEX] :]

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

                    self.reroute_vehicle(vid)

    def prepare_new_vehicles(self):
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        n_new = len(newly_inserted_vehicles)
        if n_new != 0:
            print(f"{n_new} new vehicle{'' if n_new == 1 else 's'} {'was' if n_new == 1 else 'were'} inserted")
        
        for vid in newly_inserted_vehicles:
            # Store the timestep when a vehicle was inserted into the simulation
            traci.vehicle.setParameter(vid, "timestep", self.zone_manager.current_timestep)

    def reroute(self):
        if self.sim_config["enableRerouting"]:
            if self.sim_config["dynamicRerouting"]:
                self.dynamic_rerouting()
            else:
                self.static_rerouting()

    def step(self, t):
        # Do something at every simulaton step
        self.prepare_new_vehicles()

        self.reroute()

        # Return true to indicate that the step listener should stay active in the next step
        return True
