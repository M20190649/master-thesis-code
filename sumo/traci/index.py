import os, sys

# Setup
if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("please declare environment variable 'SUMO_HOME'")

sumoBinary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"
sumoCmd = [sumoBinary, "-c", "../test-config.sumocfg"]

from controller import SimController

config = {"sumoCmd": sumoCmd, "steps": 1000}
controller = SimController(config)

controller.start()
