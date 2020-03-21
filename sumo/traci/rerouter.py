import traci, pprint, datetime, os
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd


class Rerouter(traci.StepListener):
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.polygon_edges = {}
        self.rerouted_vehicles = []

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event["name"] == "zone-update":
            # Do everything that needs to be done after the zones have updated
            self.polygon_edges = event["data"]

    def reroute_vehicle(self, vid):
        print(f"Rerouting vehicle {vid}")
        traci.vehicle.rerouteTraveltime(vid, False)
        traci.vehicle.setColor(vid, (255, 0, 0))
        self.rerouted_vehicles.append(vid)

    def static_rerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for vid in newly_inserted_vehicles:
            # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

            # Check if route includes edges that are within air quality zone polygons
            route = traci.vehicle.getRoute(vid)
            edges_to_avoid = []

            # If any edge is within any polygon avoid all polygon edges
            for pid in traci.polygon.getIDList():
                for eid in route:
                    if eid in self.polygon_edges[pid]:
                        edges_to_avoid.extend(self.polygon_edges[pid])
                        break

            # If the route crosses one or more polygon we need to reroute the vehicle to avoid these edges
            if len(edges_to_avoid) != 0:
                # Check if destination is within polygon
                if route[-1] in edges_to_avoid:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print("Destination is in polygon")

                for eid in edges_to_avoid:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                # Reroute
                self.reroute_vehicle(vid)

    def dynamic_rerouting(self):
        # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for pid in self.polygon_edges:
            polygon_edges = self.polygon_edges[pid]

            # Check all the newly spawned vehicles if any of them are located within the zone
            # If yes reroute them immediately
            for vid in newly_inserted_vehicles:
                route = traci.vehicle.getRoute(vid)
                # Check if starting edge is within the polygon
                if route[0] in polygon_edges:
                    print(f"New vehicle was inserted inside polygon {pid}.")
                    for eid in polygon_edges:
                        # Set travel times for all edges to very high value
                        traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                    self.reroute_vehicle(vid)

            # Go through all polygons and get all vehicles within dynamic rerouting range
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            if polygon_context is None:
                continue

            vehicle_ids = traci.vehicle.getIDList()
            vehicle_context = {
                k: v for (k, v) in polygon_context.items() if k in vehicle_ids
            }
            for vid in vehicle_context:
                if vid in self.rerouted_vehicles:
                    # Don't reroute vehicles that already have been rerouted
                    continue

                vehicle_data = polygon_context[vid]
                route = traci.vehicle.getRoute(vid)
                upcoming_edges = route[vehicle_data[tc.VAR_ROUTE_INDEX] :]
                # Check if any edge of vehicle route goes through polygon
                route_in_polygon = any(eid in polygon_edges for eid in upcoming_edges)
                if not route_in_polygon:
                    # If no, continue with next vehicle
                    continue

                # Check if destination is within polygon
                if upcoming_edges[-1] in polygon_edges:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print(f"Destination is in polygon {pid}")

                # If no, reroute
                for eid in polygon_edges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                self.reroute_vehicle(vid)

    def reroute(self):
        if self.sim_config["enableRerouting"]:
            if self.sim_config["dynamicRerouting"]:
                self.dynamic_rerouting()
            else:
                self.static_rerouting()

    def step(self, t):
        # Do something at every simulaton step
        self.reroute()

        # Return true to indicate that the step listener should stay active in the next step
        return True
