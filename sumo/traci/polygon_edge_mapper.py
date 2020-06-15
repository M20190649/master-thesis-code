import os, multiprocessing, time, functools
import sqlite3
import sumolib, traci
import traci.constants as tc
import geopandas as gpd
from lxml import etree
from shapely.geometry import LineString, Polygon, MultiPolygon, box, mapping

# base_dir = "../../aws/scenarios/B0"
base_dir = "../../simulation/charlottenburg"

conn = sqlite3.connect("zone.sqlite", 30)
c = conn.cursor()

c.execute(
    "CREATE TABLE IF NOT EXISTS polygons (id text, zone text, timestep text, shape text, edges text)"
)


def split_polygon(shape, parts=2):
    polygon = Polygon(shape)
    (minx, miny, maxx, maxy) = polygon.bounds
    part_width = (maxx - minx) / parts
    part_shapes = []
    for i in range(parts):
        part_bbox = box(minx + i * part_width, miny, minx + (i + 1) * part_width, maxy)
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
            splitted_parts = split_polygon(s)
            part_shapes.extend(splitted_parts)
        else:
            part_shapes.append(s)

    return part_shapes


def find_edges(file_path):
    t = time.time()
    polygons = []
    for event, element in etree.iterparse(file_path, tag="poly"):
        p = {
            "id": element.attrib["id"],
            "zone": element.attrib["id"].split("-")[-2],
            "timestep": os.path.basename(file_path).split(".")[0].split("T")[1],
            "shape": element.attrib["shape"],
        }
        polygons.append(p)

    sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo"
    sumo_cmd = [
        sumo_binary,
        "--net-file",
        base_dir + "/network/network.net.xml",
        "--no-warnings",
        "--no-step-log",
    ]
    traci.start(sumo_cmd, label=file_path)

    def get_edges(pid, shape):
        traci.polygon.add(pid, shape, [0, 0, 0])
        traci.polygon.subscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.ID_COUNT])
        polygon_context = traci.polygon.getContextSubscriptionResults(pid)
        # Remove context subscription because we don't need it anymore
        traci.polygon.unsubscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0)

        edges_in_polygon = []
        if polygon_context is not None:
            edges_in_polygon = list(polygon_context.keys())

        traci.polygon.remove(pid)

        return edges_in_polygon

    pad = lambda n: f"0{n}" if n < 10 else n
    attribs = ["id", "zone", "timestep", "shape", "edges"]
    get_values = lambda p: [f"'{p[attrib]}'" for attrib in attribs]

    for p in polygons:
        pid = p["id"]
        shape = list(
            map(lambda pair: tuple(map(float, pair.split(","))), p["shape"].split(" "),)
        )

        if len(shape) > 255:
            shape_parts = split_polygon(shape)
            for idx, shape_part in enumerate(shape_parts):
                part_pid = f"{pid}_part-{pad(idx)}"
                p["id"] = part_pid
                shape_string = " ".join(
                    map(
                        lambda coords: ",".join(map(lambda x: str(x), coords)),
                        shape_part,
                    )
                )
                p["shape"] = shape_string
                edges = get_edges(part_pid, shape_part)
                p["edges"] = " ".join(edges)

        else:
            edges = get_edges(pid, shape)
            p["edges"] = " ".join(edges)

        print(p["id"], len(p["edges"].split(" ")), "edges")
        values = get_values(p)
        c.execute(f"INSERT INTO polygons VALUES ({','.join(values)})")
        conn.commit()

    traci.close()
    print("Done", file_path)
    print(time.time() - t)
    return


if __name__ == "__main__":
    c.execute("DROP TABLE IF EXISTS polygons")

    path = base_dir + "/airdata/PM10-idw"
    files = [os.path.join(path, f) for f in os.listdir(path) if f.endswith(".xml")]

    a = time.time()

    pool = multiprocessing.Pool()
    pool.map(find_edges, files)
    pool.close()
    pool.join()

    print(time.time() - a)
