import traci, pprint
import traci.constants as tc
import zope.event
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker(traci.StepListener):
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.polygon_edges = {}
        self.vehicle_distances = {}

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event["name"] == "zone-update":
            self.polygon_edges = event["data"]

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

            print(f"Vehicle {vid} in polygon {pid}")
            # pprint.pprint(self.vehicle_distances)

    def step(self, t):
        # Track all distances driven in each polygon
        vehicle_ids = traci.vehicle.getIDList()
        polygon_ids = traci.polygon.getIDList()
        for vid in vehicle_ids:
            for pid in polygon_ids:
                self.tracker.track_vehicle_distance_in_polygon(vid, pid)

        # Return true to indicate that the step listener should stay active in the next step
        return True
