import pprint, textwrap
import traci
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
        vehicle_vars = traci.vehicle.getAllSubscriptionResults()

        timestep_xml = Element("timestep", {"time": str(t), "zone-timestep": timestep})

        # Sort all polygons by timestep first
        all_polygons = self.zone_controller.get_polygons()
        polygons_by_timestep = {}
        for p in all_polygons:
            p_timestep = p["zone_timestep"]
            if p_timestep in polygons_by_timestep:
                polygons_by_timestep[p_timestep].append(p)
            else:
                polygons_by_timestep[p_timestep] = [p]

        for vid in traci.vehicle.getIDList():
            x, y = vehicle_vars[vid][tc.VAR_POSITION]
            location = Point(x, y)
            speed = vehicle_vars[vid][tc.VAR_SPEED]
            emission_class = vehicle_vars[vid][tc.VAR_EMISSIONCLASS]
            route = vehicle_vars[vid][tc.VAR_EDGES]
            route_index = vehicle_vars[vid][tc.VAR_ROUTE_INDEX]
            current_edge = route[route_index]
            v_timestep = traci.vehicle.getParameter(vid, "zone_timestep")

            vehicle_xml = None

            # SUMO does not support Polygons with holes
            # Find the actual polygons that the vehicle is in
            for timestep in polygons_by_timestep:
                polygons = polygons_by_timestep[timestep]

                polygon = None
                for p in polygons:
                    shape = p["shape"]
                    if shape.contains(location):
                        if polygon is None:
                            print("none")
                        else:
                            print(polygon["id"])
                        print(x, y)
                        print(p["id"])
                        if p["id"].startswith("hole"):
                            # If polygon is inside hole there is no need to search further
                            polygon = p
                            break

                        if polygon == None:
                            polygon = p
                            continue

                        if p["zone"] > polygon["zone"]:
                            polygon = p

                if polygon is not None:
                    if vehicle_xml is None:
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
                        {
                            "id": polygon["id"],
                            "zone-timestep": polygon["zone_timestep"],
                        },
                    )

        indent = 4
        xml = prettify(timestep_xml, indent=indent)
        xml = textwrap.indent(xml, " " * indent)
        self.output_file.write(xml)

    def finish(self):
        self.output_file.write("</vehicle-zone-tracking>")
