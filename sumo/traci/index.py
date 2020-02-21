import os, sys, getopt

from argparse import ArgumentParser

parser = ArgumentParser()
parser.add_argument(
    "--config",
    dest="config",
    help="Filepath to the simulation config file",
    metavar="FILE",
)

args = parser.parse_args()

# Setup
if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("Please declare the environment variable 'SUMO_HOME'")

sumoBinary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"
sumoCmd = [sumoBinary, "--configuration-file", args.config]

from controller import SimController

config = {"sumoCmd": sumoCmd, "steps": 500}
controller = SimController(config)
controller.start()
