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
        timestep = self.zone_manager.current_timestep
        vehicle_subs = traci.vehicle.getAllSubscriptionResults()
        polygon_subs = traci.polygon.getAllSubscriptionResults()
        some_vehicle_in_polygon = False

        for vid in vehicle_subs:
            for pid in polygon_subs:
                x, y = vehicle_subs[vid][tc.VAR_POSITION]
                speed = vehicle_subs[vid][tc.VAR_SPEED]
                
                polygon_shape = polygon_subs[pid][tc.VAR_SHAPE]
                location = Point(x, y)
                polygon = Polygon(polygon_shape)

                if polygon.contains(location):
                    some_vehicle_in_polygon = True
                    if vid not in self.vehicle_distances:
                        self.vehicle_distances[vid] = {}
                    
                    if timestep not in self.vehicle_distances[vid]:
                        self.vehicle_distances[vid][timestep] = {}

                    if pid in self.vehicle_distances[vid][timestep]:
                        self.vehicle_distances[vid][timestep][pid] += speed
                    else:
                        self.vehicle_distances[vid][timestep][pid] = 0

                    # print(f"Vehicle {vid} in polygon {pid}")

        if some_vehicle_in_polygon:
            # pprint.pprint(self.vehicle_distances)
            pass

    def step(self, t):
        # Track all distances driven in each polygon
        self.track_vehicles_in_polygons()

        # Return true to indicate that the step listener should stay active in the next step
        return True
