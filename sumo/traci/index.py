import os, sys, getopt, json, math, re

from logger import open_log, log

from argparse import ArgumentParser

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

# Add some additional data to simulation config dictionary
sim_config["sim_gui"] = args.gui
sim_config["sim_outputDir"] = sim_output_dir
sim_config["sim_airDataDir"] = sim_airdata_dir

# Make sure dynamicReroutingDistance is a float
sim_config["dynamicReroutingDistance"] = float(sim_config["dynamicReroutingDistance"])

sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo"

if args.gui:
    sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"

sumo_cmd = [
    sumo_binary,
    "--configuration-file",
    args.sumo_config,
    # "--mesosi"
]

from simulation_controller import SimulationController

traci_config = {"sumo_cmd": sumo_cmd}
controller = SimulationController(traci_config, sim_config)
controller.start()
