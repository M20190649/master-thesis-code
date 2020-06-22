import pprint, textwrap
import traci
import traci.constants as tc
import zope.event
from shapely.geometry import Point
from xml.dom import minidom
from lxml import etree
from lxml.etree import Element, SubElement

from logger import log


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

                holes = []
                possible_polygons = []
                for p in polygons:
                    shape = p["shape"]
                    if shape.contains(location):
                        if p["id"].startswith("hole"):
                            holes.append(p)
                        else:
                            possible_polygons.append(p)

                polygon = None
                for p in possible_polygons:
                    matching_hole = next(
                        (h for h in holes if h["zone"] == p["zone"]), None,
                    )
                    if matching_hole is not None:
                        if matching_hole["type"] == "empty-hole":
                            # Vehicle is inside Zone 0
                            polygon = matching_hole
                            break
                        else:
                            # Hole is just another nested zone (type: "filled-hole")
                            holes.remove(matching_hole)
                            continue
                    else:
                        # Vehicle is inside a zone
                        polygon = p
                        break

                if polygon is None:
                    # Vehicle is in no polygon
                    continue

                if polygon["id"].startswith("hole"):
                    # Vehicle is in Zone 0
                    # No need to track the driven distance
                    continue

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
                    {"id": polygon["id"], "zone-timestep": polygon["zone_timestep"],},
                )

        indent = 4
        xml = prettify(timestep_xml, indent=indent)
        xml = textwrap.indent(xml, " " * indent)
        self.output_file.write(xml)

    def finish(self):
        self.output_file.write("</vehicle-zone-tracking>")
