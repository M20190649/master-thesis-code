import traci, pprint
import traci.constants as tc
import zope.event
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker(traci.StepListener):
    def __init__(self, sim_config, zone_manager):
        self.sim_config = sim_config
        self.zone_manager = zone_manager
        self.vehicle_distances = {}

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event == "zone-update":
            pass

    def track_vehicles_in_polygons(self):
        vehicle_ids = traci.vehicle.getIDList()
        polygon_ids = traci.polygon.getIDList()
        some_vehicle_in_polygon = False
        for vid in vehicle_ids:
            for pid in polygon_ids:
                timestep = traci.polygon.getParameter(pid, "timestep")
                x, y = traci.vehicle.getPosition(vid)
                polygon_shape = traci.polygon.getShape(pid)
                location = Point(x, y)
                polygon = Polygon(polygon_shape)

                speed = traci.vehicle.getSpeed(vid)

                if polygon.contains(location):
                    some_vehicle_in_polygon = True
                    if timestep not in self.vehicle_distances:
                        self.vehicle_distances[timestep] = {}

                    if vid not in self.vehicle_distances[timestep]:
                        self.vehicle_distances[timestep][vid] = {}

                    if pid in self.vehicle_distances[timestep][vid]:
                        self.vehicle_distances[timestep][vid][pid] += speed
                    else:
                        self.vehicle_distances[timestep][vid][pid] = 0

                    # print(f"Vehicle {vid} in polygon {pid}")

        if some_vehicle_in_polygon:
            # pprint.pprint(self.vehicle_distances)
            pass

    def step(self, t):
        # Track all distances driven in each polygon
        self.track_vehicles_in_polygons()

        # Return true to indicate that the step listener should stay active in the next step
        return True
