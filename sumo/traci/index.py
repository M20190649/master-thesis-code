import os, sys, getopt, json, math, re

from argparse import ArgumentParser

parser = ArgumentParser()
parser.add_argument(
    "--config",
    dest="config",
    help="Filepath to the simulation config file",
    metavar="FILE",
)
parser.add_argument(
    "--sumo-config",
    dest="sumo_config",
    help="Filepath to the SUMO config file",
    metavar="FILE",
)
parser.add_argument(
    "--gui",
    dest="gui",
    help="Run simulation in SUMO GUI",
    metavar="BOOLEAN",
    nargs='?'
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

# Add some additional data to simulation config dictionary
sim_dir = os.path.dirname(os.path.realpath(args.config))
sim_name = re.search(".*(?=\.)", os.path.basename(args.config)).group(0)
sim_config["sim_airDataDir"] = os.path.join(sim_dir, sim_name, "airdata", sim_config["interpolationMethod"])
sim_config["sim_outputDir"] = os.path.join(sim_dir, sim_name, "output")

sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo"

if args.gui is not None:
    sumo_binary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"

sumo_cmd = [sumo_binary, "--configuration-file", args.sumo_config]

from simulation_controller import SimulationController

traci_config = {"sumo_cmd": sumo_cmd}
controller = SimulationController(traci_config, sim_config)
controller.start()
