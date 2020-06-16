import os, multiprocessing, time, functools
import sqlite3
import sumolib, traci
import traci.constants as tc
from lxml import etree

conn = sqlite3.connect("zones.sqlite", 30)
c = conn.cursor()

c.execute(
    "CREATE TABLE IF NOT EXISTS polygons (id text, zone text, timestep text, shape text, edges text)"
)

attribs = ["id", "zone", "timestep", "shape", "edges"]
get_values = lambda p: [f"'{p[attrib]}'" for attrib in attribs]


def find_edges(start, file_path):
    t = time.time()
    polygons = []
    for event, element in etree.iterparse(file_path, tag="poly"):
        p = {
            "id": element.attrib["id"],
            "zone": element.attrib["id"].split("-")[-2],
            "timestep": os.path.basename(file_path).split(".")[0].split("T")[1],
            "shape": element.attrib["shape"],
            "layer": element.attrib["layer"],
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

    for p in polygons:
        pid = p["id"]
        shape = list(
            map(lambda pair: tuple(map(float, pair.split(","))), p["shape"].split(" "),)
        )
        traci.polygon.add(pid, shape, [0, 0, 0])
        traci.polygon.subscribeContext(pid, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.ID_COUNT])
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

    traci.close()
    print("Done", os.path.basename(file_path), f"({format(time.time() - t, '.3f')}s)")
    print("Total time:", format(time.time() - start, ".3f"), "s")
    return


# base_dir = "../../aws/scenarios/B0"
base_dir = "../../simulation/charlottenburg"

if __name__ == "__main__":
    c.execute("DROP TABLE IF EXISTS polygons")

    path = base_dir + "/airdata/PM10-idw"
    files = [os.path.join(path, f) for f in os.listdir(path) if f.endswith(".xml")]

    a = time.time()

    pool = multiprocessing.Pool()
    func = functools.partial(find_edges, time.time())
    pool.map(func, files)
    pool.close()
    pool.join()

    print(time.time() - a)
