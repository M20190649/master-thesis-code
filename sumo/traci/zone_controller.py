import traci, pprint, datetime, os
from itertools import chain
import zope.event
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd


class ZoneController(traci.StepListener):
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.current_timestep = ""
        self.__polygon_edges = {}

    def get_polygon_edges(self, pid=None):
        if pid is None:
            return list(chain(*self.__polygon_edges.values()))
        else:
            return self.__polygon_edges[pid]

    def add_polygon_subscriptions(self, pid):
        # Polygon context used for dynamic routing
        traci.polygon.subscribeContext(
            pid, tc.CMD_GET_VEHICLE_VARIABLE, self.sim_config["dynamicReroutingDistance"]
        )
        traci.polygon.subscribe(pid, [tc.VAR_SHAPE])

    def remove_polygon_subscriptions(self, pid):
        traci.polygon.unsubscribeContext(
            pid, tc.CMD_GET_VEHICLE_VARIABLE, self.sim_config["dynamicReroutingDistance"]
        )
        traci.polygon.unsubscribe(pid)

    def split_polygon(self, shape, parts=2):
        polygon = Polygon(shape)
        (minx, miny, maxx, maxy) = polygon.bounds
        part_width = (maxx - minx) / parts
        part_shapes = []
        for i in range(parts):
            part_bbox = box(
                minx + i * part_width, miny, minx + (i + 1) * part_width, maxy
            )
            part_poly = gpd.GeoSeries(polygon.intersection(part_bbox))

            shapely_obj = part_poly[0]
            if type(shapely_obj) == MultiPolygon:
                geojson = mapping(shapely_obj)
                for p in geojson["coordinates"]:
                    part_shapes.append(list(p[0]))

            if type(shapely_obj) == Polygon:
                geojson = mapping(shapely_obj)
                part_shapes.append(list(geojson["coordinates"][0]))

        for i in range(len(part_shapes)):
            s = part_shapes.pop(0)
            if len(s) > 255:
                print(
                    "Part is still too big (more than 255 points)! Splitting again..."
                )
                splitted_parts = self.split_polygon(s)
                part_shapes.extend(splitted_parts)
            else:
                part_shapes.append(s)

        return part_shapes

    def add_polygon(self, pid, shape, color, layer):
        traci.polygon.add(pid, shape, color, fill=True, layer=layer)
        traci.polygon.setParameter(pid, "zone", str(layer))
        traci.polygon.setParameter(pid, "timestep", self.current_timestep)

        # Add all necessary context subscriptions
        self.add_polygon_subscriptions(pid)

        # Calculate and store all edges that are covered by each new polygon
        # Add temporary subscription to be able to query for all edges
        # Get all edges for polygon pid that are within distance of 0
        traci.polygon.subscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0)
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

        # Filter out edge data
        edge_ids = traci.edge.getIDList()
        edges_in_polygon = [
            k for (k, v) in polygon_context.items() if k in edge_ids
        ]
        print(f"Found {len(edges_in_polygon)} edges in polygon {pid}")
        self.__polygon_edges[pid] = edges_in_polygon

    def load_polygons(self, t):
        # Remove all old polygons
        print("Removing old polygons")
        for pid in traci.polygon.getIDList():
            self.remove_polygon_subscriptions(pid)
            traci.polygon.remove(pid)

        # Load the XML file for the current timestep
        pad = lambda n: f"0{n}" if n < 10 else n
        date_parts = list(map(lambda n: str(pad(int(n))), self.sim_config["simulationDate"].split(".")))
        date_string = "-".join(date_parts[::-1])
        utc = datetime.datetime.utcfromtimestamp(t)
        time_string = f"{pad(utc.hour)}-{pad(utc.minute)}-{pad(utc.second)}"
        zone_file = f"zones_{date_string}T{time_string}.xml"
        # zone_file = f"zones_{date_string}T10-00-00.xml"
        self.current_timestep = time_string

        print(f"Loading {zone_file}")
        xml_tree = et.parse(os.path.join(self.sim_config["sim_airDataDir"], zone_file))

        # Traverse the XML tree and add all new polygons
        print("Adding new polygons")
        for child in xml_tree.getroot():
            if child.tag == "poly":
                pid = f"{child.attrib['id']}_{self.current_timestep}"
                shape = list(
                    map(
                        lambda pair: tuple(map(float, pair.split(","))),
                        child.attrib["shape"].split(" "),
                    )
                )
                color = list(map(int, child.attrib["color"].split(",")))
                layer = int(float(child.attrib["layer"]))

                # SUMO can't handle polygons with more than 255 coordinates so I need to split them into multiple polygons
                if len(shape) > 255:
                    print(
                        f"Warning: Zone polygon is too large ({len(shape)} points) (SUMO can't handle polygons with more than 255 points)"
                    )
                    print("Splitting zone polygon into multiple parts...")
                    shape_parts = self.split_polygon(shape)
                    print(f"Split zone polygon into {len(shape_parts)} parts")

                    for idx, shape_part in enumerate(shape_parts):
                        part_pid = f"{pid}-{idx}"
                        self.add_polygon(part_pid, shape_part, color, layer)
                else:
                    self.add_polygon(pid, shape, color, layer)

        # Notify subscribers about the zone update
        zope.event.notify("zone-update")

    def step(self, t):
        if t > 0 and t % (self.sim_config["zoneUpdateInterval"] * 60) == 0:
            # if t > 0 and t % 40 == 0:
            print("New timestep! Zones will be updated...")
            self.load_polygons(t)
            print("Done")

        # Return true to indicate that the step listener should stay active in the next step
        return True
