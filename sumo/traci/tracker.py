import traci, pprint, textwrap
import traci.constants as tc
import zope.event
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon
from xml.dom import minidom
from lxml import etree
from lxml.etree import Element, SubElement

def prettify(elem, indent=4):
    ugly_string = etree.tostring(elem, encoding="utf-8")
    reparsed = minidom.parseString(ugly_string)
    root = reparsed.childNodes[0] # remove declaration header
    return root.toprettyxml(indent=" " * indent)

class Tracker(traci.StepListener):
    def __init__(self, sim_config, zone_controller):
        self.sim_config = sim_config
        self.zone_controller = zone_controller
        self.vehicle_distances = {}
        
        output_file_path = f"{sim_config['sim_outputDir']}/vehicle-zone-tracking.xml"
        self.output_file = open(output_file_path, "w")
        self.output_file.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        self.output_file.write("<vehicle-zone-tracking>\n")

        # Register event handler
        zope.event.subscribers.append(self.event_handler)

    def event_handler(self, event):
        if event == "zone-update":
            pass

    def track_vehicles_in_polygons(self, t):
        timestep = self.zone_controller.current_timestep
        vehicle_subs = traci.vehicle.getAllSubscriptionResults()
        polygon_subs = traci.polygon.getAllSubscriptionResults()
        some_vehicle_in_polygon = False

        timestep_xml = Element(
            "timestep", 
            {"time": str(t), "zone-timestep": timestep}
        )

        for vid in vehicle_subs:
            vehicle_xml = None
            for pid in polygon_subs:
                x, y = vehicle_subs[vid][tc.VAR_POSITION]
                speed = vehicle_subs[vid][tc.VAR_SPEED]
                
                polygon_shape = polygon_subs[pid][tc.VAR_SHAPE]
                location = Point(x, y)
                polygon = Polygon(polygon_shape)

                if polygon.contains(location):
                    some_vehicle_in_polygon = True

                    if vehicle_xml is None:
                        v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")
                        vehicle_xml = SubElement(
                            timestep_xml, 
                            "vehicle", 
                            {
                                "id": vid, 
                                "zone-timestep": v_timestep,
                                "speed": str(speed)
                            }
                        )

                    p_timestep = traci.polygon.getParameter(pid, "zone_timestep")
                    polygon_xml = SubElement(
                        vehicle_xml, 
                        "polygon", 
                        {"id": pid, "zone-timestep": p_timestep}
                    )

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

        indent = 4
        xml = prettify(timestep_xml, indent=indent)
        xml = textwrap.indent(xml, " " * indent)
        self.output_file.write(xml)

    def finish(self):
        self.output_file.write("</vehicle-zone-tracking>")
        pass

    def step(self, t):
        # Track all distances driven in each polygon
        self.track_vehicles_in_polygons(t)

        # Return true to indicate that the step listener should stay active in the next step
        return True
