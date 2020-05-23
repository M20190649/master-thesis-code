import traci, pprint, textwrap
import traci.constants as tc
import zope.event
from shapely.geometry import Point
from xml.dom import minidom
from lxml import etree
from lxml.etree import Element, SubElement


def prettify(elem, indent=4):
    ugly_string = etree.tostring(elem, encoding="utf-8")
    reparsed = minidom.parseString(ugly_string)
    root = reparsed.childNodes[0]  # remove declaration header
    return root.toprettyxml(indent=" " * indent)


class Tracker:
    def __init__(self, sim_config, zone_controller):
        self.sim_config = sim_config
        self.zone_controller = zone_controller

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
        some_vehicle_in_polygon = False

        timestep_xml = Element("timestep", {"time": str(t), "zone-timestep": timestep})

        for vid in traci.vehicle.getIDList():
            vehicle_xml = None
            x, y = vehicle_subs[vid][tc.VAR_POSITION]
            location = Point(x, y)
            speed = vehicle_subs[vid][tc.VAR_SPEED]
            emission_class = vehicle_subs[vid][tc.VAR_EMISSIONCLASS]
            route = vehicle_subs[vid][tc.VAR_EDGES]
            route_index = vehicle_subs[vid][tc.VAR_ROUTE_INDEX]
            current_edge = route[route_index]
            for p in self.zone_controller.get_polygons():
                shape = p["shape"]
                if shape.contains(location):
                    some_vehicle_in_polygon = True

                    if vehicle_xml is None:
                        v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")
                        vehicle_xml = SubElement(
                            timestep_xml,
                            "vehicle",
                            {
                                "id": vid,
                                "zone-timestep": v_timestep,
                                "speed": str(speed),
                                "edge": current_edge,
                                "emission-class": emission_class,
                            },
                        )

                    polygon_xml = SubElement(
                        vehicle_xml,
                        "polygon",
                        {"id": p["id"], "zone-timestep": p["zone_timestep"],},
                    )

                    # print(f"Vehicle {vid} in polygon {pid}")

        indent = 4
        xml = prettify(timestep_xml, indent=indent)
        xml = textwrap.indent(xml, " " * indent)
        self.output_file.write(xml)

    def finish(self):
        self.output_file.write("</vehicle-zone-tracking>")
