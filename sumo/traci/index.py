import os, sys, getopt, json

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
    dest="sumoConfig",
    help="Filepath to the SUMO config file",
    metavar="FILE",
)

args = parser.parse_args()

# Setup
if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("Please declare the environment variable 'SUMO_HOME'")

with open(args.config) as configPath:
    simConfig = json.load(configPath)

# sumoBinary = os.environ["SUMO_HOME"] + "/bin/sumo"
sumoBinary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"
sumoCmd = [sumoBinary, "--configuration-file", args.sumoConfig]

from controller import SimController

traciConfig = {"sumoCmd": sumoCmd, "steps": 500}
controller = SimController(traciConfig, simConfig)
controller.start()
