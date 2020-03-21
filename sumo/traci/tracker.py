import traci, pprint
import traci.constants as tc
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker:
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.polygon_edges = {}
        self.vehicle_distances = {}

    def add_polygon_subscriptions(self, pid):
        # Polygon context used for dynamic routing
        traci.polygon.subscribeContext(
            pid,
            tc.CMD_GET_VEHICLE_VARIABLE,
            self.sim_config["dynamicReroutingDistance"],
            [
                tc.VAR_EMISSIONCLASS,  # Distinguish between gas and electric cars. Electric cars don't need to be rerouted
                tc.VAR_ROUTE_INDEX,  # Vehicles that have their destination within the zone shouldn't be rerouted
                tc.VAR_NEXT_STOPS,
            ],
        )

    def remove_polygon_subscriptions(self, pid):
        traci.polygon.unsubscribeContext(
            pid,
            tc.CMD_GET_VEHICLE_VARIABLE,
            self.sim_config["dynamicReroutingDistance"],
        )

    def update_polygons(self):
        for pid in traci.polygon.getIDList():
            # Store all edges that are covered by each polygon

            # Add subscription temporarily to be able to query for all edges
            # Get all edges for polygon pid that are within distance of 0
            traci.polygon.subscribeContext(
                pid, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.VAR_NAME],
            )
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            # Remove context subscription because we don't need it anymore
            traci.polygon.unsubscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0)

            if polygon_context is None:
                print(
                    f"Polygon {pid} will be removed because it is not covering any edges."
                )
                # Edges subscription can be None when the polygon doesn't cover any edges
                # Since it doesn't cover any edges it can be removed
                traci.polygon.remove(pid)
                continue

            # Filter out edge data
            edge_ids = traci.edge.getIDList()
            edge_context = {k: v for (k, v) in polygon_context.items() if k in edge_ids}
            edges_in_polygon = edge_context.keys()
            print(f"Found {len(edges_in_polygon)} edges in polygon {pid}")
            self.polygon_edges[pid] = edges_in_polygon

            # Add all other necessary context subscriptions
            self.add_polygon_subscriptions(pid)

    def track_vehicle_distance_in_polygon(self, vid, pid):
        timestep = traci.polygon.getParameter(pid, "timestep")
        x, y = traci.vehicle.getPosition(vid)
        polygon_shape = traci.polygon.getShape(pid)
        location = Point(x, y)
        polygon = Polygon(polygon_shape)

        speed = traci.vehicle.getSpeed(vid)

        if polygon.contains(location):
            if timestep not in self.vehicle_distances:
                self.vehicle_distances[timestep] = {}

            if vid not in self.vehicle_distances[timestep]:
                self.vehicle_distances[timestep][vid] = {}

            if pid in self.vehicle_distances[timestep][vid]:
                self.vehicle_distances[timestep][vid][pid] += speed
            else:
                self.vehicle_distances[timestep][vid][pid] = 0

            # print("Vehicle in polygon")
            # pprint.pprint(self.vehicle_distances)
