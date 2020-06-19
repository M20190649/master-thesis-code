import sys, os, multiprocessing, time, functools, uuid
from argparse import ArgumentParser
import sqlite3
from lxml import etree

if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("Please declare the environment variable 'SUMO_HOME'")

import sumolib, traci
import traci.constants as tc


parser = ArgumentParser()
parser.add_argument(
    "--dir",
    "-d",
    dest="dir",
    help="Path to scenario directory",
    metavar="FILE",
    type=str,
)

args = parser.parse_args()
base_dir = os.path.abspath(args.dir)

conn = sqlite3.connect(os.path.join(base_dir, "airdata", "polygons.sqlite"), 30)
c = conn.cursor()

attribs = [
    {"name": "id", "type": "text",},
    {"name": "zone", "type": "text"},
    {"name": "timestep", "type": "text"},
    {"name": "color", "type": "text"},
    {"name": "layer", "type": "integer"},
    {"name": "shape", "type": "text"},
    {"name": "edges", "type": "text"},
]

table_string = ", ".join(
    list(map(lambda attrib: f"{attrib['name']} {attrib['type']}", attribs))
)
c.execute(f"CREATE TABLE IF NOT EXISTS polygons ({table_string})")

get_values = lambda p: [f"'{p[attrib['name']]}'" for attrib in attribs]


def process_files(start, files):
    def get_polygons(file_path):
        t = time.time()
        polygons = []
        for event, element in etree.iterparse(file_path, tag="poly"):
            p = {
                "id": element.attrib["id"],
                "zone": int(element.attrib["id"].split("-")[-2]),
                "timestep": os.path.basename(file_path).split(".")[0].split("T")[1],
                "color": element.attrib["color"],
                "layer": int(float(element.attrib["layer"])),
                "shape": element.attrib["shape"],
            }
            polygons.append(p)

        for p in polygons:
            pid = p["id"]
            shape = list(
                map(
                    lambda pair: tuple(map(float, pair.split(","))),
                    p["shape"].split(" "),
                )
            )
            color = list(map(int, p["color"].split(",")))
            traci.polygon.add(pid, shape, color)
            traci.polygon.subscribeContext(
                pid, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.ID_COUNT]
            )
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            traci.polygon.unsubscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0)

            edges_in_polygon = []
            if polygon_context is not None:
                edges_in_polygon = list(polygon_context.keys())

            p["edges"] = " ".join(edges_in_polygon)

            traci.polygon.remove(pid)

            print(p["id"], len(p["edges"].split(" ")), "edges")
            values = get_values(p)
            c.execute(f"INSERT INTO polygons VALUES ({','.join(values)})")
            conn.commit()

        print(
            "Done", os.path.basename(file_path), f"({format(time.time() - t, '.3f')}s)"
        )
        print("Total time:", format(time.time() - start, ".3f"), "s")

    sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo"
    sumo_cmd = [
        sumo_binary,
        "--net-file",
        base_dir + "/network/network.net.xml",
        "--no-warnings",
        "--no-step-log",
    ]
    traci.start(sumo_cmd, label=uuid.uuid4())

    for file in files:
        get_polygons(file)

    traci.close()


if __name__ == "__main__":
    c.execute("DROP TABLE IF EXISTS polygons")

    path = base_dir + "/airdata/PM10-idw"
    files = [os.path.join(path, f) for f in os.listdir(path) if f.endswith(".xml")]

    def chunks(l, n):
        n = max(1, n)
        return [l[i : i + n] for i in range(0, len(l), n)]

    files_per_process = 5
    files = chunks(files, files_per_process)

    start = time.time()

    pool = multiprocessing.Pool()
    func = functools.partial(process_files, start)
    pool.map(func, files)
    pool.close()
    pool.join()
