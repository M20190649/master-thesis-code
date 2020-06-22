import os, sys, getopt, json, math, re
from argparse import ArgumentParser

from logger import open_log, log
import poly_db

parser = ArgumentParser()
parser.add_argument(
    "--config",
    dest="config",
    help="Filepath to the simulation config file",
    metavar="FILE",
    type=str,
)
parser.add_argument(
    "--sumo-config",
    dest="sumo_config",
    help="Filepath to the SUMO config file",
    metavar="FILE",
    type=str,
)
parser.add_argument(
    "--gui",
    dest="gui",
    help="Run simulation in SUMO GUI",
    metavar="BOOLEAN",
    type=bool,
    default=False,
)
parser.add_argument(
    "--db",
    dest="db",
    help="Use SQLite database containing all polygons for air pollution zones",
    metavar="BOOLEAN",
    type=str,
)

args = parser.parse_args()

# Setup
if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("Please declare the environment variable 'SUMO_HOME'")

with open(args.config) as configPath:
    sim_config = json.load(configPath)


sim_dir = os.path.dirname(os.path.realpath(args.config))
sim_name = re.search(".*(?=\.)", os.path.basename(args.config)).group(0)
sim_output_dir = os.path.join(sim_dir, sim_name, "output")
sim_airdata_dir = os.path.join(
    sim_dir,
    sim_name,
    "airdata",
    f"{sim_config['pollutant']}-{sim_config['interpolationMethod']}",
)

# Log the given configuration
log_path = os.path.join(sim_output_dir, "simulation-logs.txt")
open_log(log_path)
log("Simulation starting with the following configuration:\n")
log(sim_config)
log()

# Find and connect to DB if necessary
if args.db:
    search_dir = os.path.join(sim_dir, sim_name, "airdata",)
    db_path = poly_db.find_db(search_dir)
    if db_path is None:
        error = "No SQLite database found in airdata directory"
        log(error)
        raise ValueError(error)

    poly_db.connect(db_path)

# Add some additional data to simulation config dictionary
sim_config["sim_airDataDir"] = sim_airdata_dir
sim_config["sim_polygonDatabase"] = args.db
sim_config["sim_outputDir"] = sim_output_dir

# Make sure dynamicReroutingDistance is a float
sim_config["dynamicReroutingDistance"] = float(sim_config["dynamicReroutingDistance"])

sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo"

if args.gui:
    sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"

sumo_cmd = [sumo_binary, "--configuration-file", args.sumo_config]

if "mesosim" in sim_config and sim_config["mesosim"]:
    log("Using mesoscopic simulation model")
    sumo_cmd.append("--mesosim")
else:
    log("Using microscopic simulation model")

if "libsumo" in sim_config and sim_config["libsumo"]:
    log("Using libsumo")
    os.environ["LIBSUMO_AS_TRACI"] = "pleaseuselibsumokthxbye"
else:
    log("Using TraCI")

log()

from simulation_controller import SimulationController

controller = SimulationController(sumo_cmd, sim_config)
controller.start()
