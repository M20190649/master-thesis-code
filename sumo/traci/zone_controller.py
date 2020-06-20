import pprint, datetime, os, math
import sqlite3
import traci
from itertools import chain
import zope.event
from lxml import etree
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd

from logger import log


class ZoneController:
    def __init__(self, sim_config):
        self.sim_config = sim_config
        self.current_timestep = ""
        self.__polygons = {}

    def get_polygons(self):
        return list(self.__polygons.values())

    def get_polygon(self, pid):
        return self.__polygons[pid]

    def get_polygon_ids(self):
        return list(self.__polygons.keys())

    def get_polygons_by_timestep(self, timestep=None, holes=True):
        def filter_polygon(polygon):
            if not holes:
                if polygon["id"].startswith("hole"):
                    return False

            p_timestep = polygon["zone_timestep"]
            return p_timestep == (timestep or self.current_timestep)

        def sort_polygon(polygon):
            if polygon["id"].startswith("hole"):
                return math.inf
            else:
                return polygon["zone"]

        polygons = list(filter(filter_polygon, self.__polygons.values()))
        polygons.sort(key=sort_polygon)

        return polygons

    def load_polygons_from_file(self):
        # Load the XML file for the current timestep
        pad = lambda n: f"0{n}" if n < 10 else n
        date_parts = list(
            map(
                lambda n: str(pad(int(n))), self.sim_config["simulationDate"].split(".")
            )
        )
        date_string = "-".join(date_parts[::-1])

        zone_file = f"zones_{date_string}T{self.current_timestep}.xml"
        # zone_file = f"zones_{date_string}T10-00-00.xml"
        log(f"Loading {zone_file} file")

        file_path = os.path.join(self.sim_config["sim_airDataDir"], zone_file)

        # Traverse the XML tree and add all new polygons
        log(f"Adding new polygons for timestep {self.current_timestep}")
        for event, poly in etree.iterparse(file_path, tag="poly"):
            pid = f"{poly.attrib['id']}_{self.current_timestep}"
            shape = list(
                map(
                    lambda pair: tuple(map(float, pair.split(","))),
                    poly.attrib["shape"].split(" "),
                )
            )
            color = list(map(int, poly.attrib["color"].split(",")))
            layer = int(float(poly.attrib["layer"]))

            traci.polygon.add(pid, shape, color, fill=True, layer=layer)

            polygon = {
                "id": pid,
                "zone": int(pid.split("_")[0].split("-")[-2]),
                "zone_timestep": self.current_timestep,
                "shape": Polygon(shape),
            }

            # Calculate and store all edges that are covered by each new polygon
            # Add temporary subscription to be able to query for all edges
            # Get all edges for polygon pid that are within distance of 0
            traci.polygon.subscribeContext(
                pid, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.ID_COUNT]
            )
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            # Remove context subscription because we don't need it anymore
            traci.polygon.unsubscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0)

            if polygon_context is None:
                log(
                    f"Polygon {pid} will be removed because it is not covering any edges."
                )
                # Edges subscription can be None when the polygon doesn't cover any edges
                # Since it doesn't cover any edges it can be removed
                traci.polygon.remove(pid)
                continue

            edges_in_polygon = list(polygon_context.keys())
            log(f"Found {len(edges_in_polygon)} edges in polygon {pid}")
            polygon["edges"] = edges_in_polygon

            self.__polygons[pid] = polygon

    def load_polygons_from_db(self):
        db_path = self.sim_config["sim_polygonDatabase"]

        db_exists = os.path.isfile(db_path)
        if not db_exists:
            error = "Database file zones.sqlite does not exist!"
            log(error)
            raise ValueError(error)

        conn = sqlite3.connect(db_path, 30)
        c = conn.cursor()

        log(f"Querying polygons for timestep {self.current_timestep} from database")
        rows = c.execute(
            f"SELECT * FROM polygons WHERE timestep='{self.current_timestep}'"
        )

        log(f"Adding new polygons for timestep {self.current_timestep}")
        for row in rows:
            pid, zone, timestep, color_string, layer, shape_string, edges_string = row
            pid = f"{pid}_{self.current_timestep}"
            shape = list(
                map(
                    lambda pair: tuple(map(float, pair.split(","))),
                    shape_string.split(" "),
                )
            )
            color = list(map(int, color_string.split(",")))
            edges_in_polygon = edges_string.split(" ")

            if len(edges_in_polygon) == 0:
                log(
                    f"Polygon {pid} will not be added because it is not covering any edges."
                )
                continue

            traci.polygon.add(pid, shape, color, fill=True, layer=layer)

            polygon = {
                "id": pid,
                "zone": int(zone),
                "zone_timestep": self.current_timestep,
                "shape": Polygon(shape),
                "edges": edges_in_polygon,
            }

            self.__polygons[pid] = polygon

    def remove_polygons(self, t):
        if t < 0:
            return

        timestep = self.get_timestep_from_step(t)
        log(f"Removing polygons from timestep {timestep}")
        for p in self.get_polygons_by_timestep(timestep=timestep):
            pid = p["id"]
            traci.polygon.remove(pid)
            del self.__polygons[pid]

    def hide_polygons(self, t):
        if t < 0:
            return

        timestep = self.get_timestep_from_step(t)
        log(f"Hiding polygons from timestep {timestep}")
        for p in self.get_polygons_by_timestep(timestep=timestep):
            traci.polygon.setFilled(p["id"], False)

    def get_timestep_from_step(self, t):
        pad = lambda n: f"0{n}" if n < 10 else n
        utc = datetime.datetime.utcfromtimestamp(t)
        time_string = f"{pad(utc.hour)}-{pad(utc.minute)}-{pad(utc.second)}"
        return time_string

    def update_zones(self, step):
        log("New timestep! Zones will be updated...")
        interval = self.sim_config["zoneUpdateInterval"] * 60
        timestep = self.get_timestep_from_step(step)
        self.current_timestep = timestep
        # Always keep the polygons up until three hours after they have been loaded
        keep_duration = 2 * 60 * 60
        self.remove_polygons(step - keep_duration)
        # Hide the polygons from last timestep
        self.hide_polygons(step - interval)

        if self.sim_config["sim_polygonDatabase"] is not None:
            self.load_polygons_from_db()
        else:
            self.load_polygons_from_file()

        log("Done\n")

        # Notify subscribers about the zone update
        zope.event.notify("zone-update")
