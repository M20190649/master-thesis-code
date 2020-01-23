import os, sys

# Setup
if "SUMO_HOME" in os.environ:
    tools = os.path.join(os.environ["SUMO_HOME"], "tools")
    sys.path.append(tools)
else:
    sys.exit("please declare environment variable 'SUMO_HOME'")

print()

sumoBinary = os.environ["SUMO_HOME"] + "/bin/sumo-gui"
sumoCmd = [sumoBinary, "-c", "../test-config.sumocfg"]

import traci
import traci.constants as tc

traci.start(sumoCmd)
traci.vehicle.subscribe("vehicle_0", (tc.VAR_ROAD_ID, tc.VAR_LANEPOSITION))
print(traci.vehicle.getSubscriptionResults("vehicle_0"))

step = 0
while step < 1000:
    print("step", step)
    traci.simulationStep()
    print(traci.vehicle.getSubscriptionResults("vehicle_0"))

    step += 1


traci.close()
