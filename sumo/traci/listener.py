from tracker import Tracker

import traci


class StepListener(traci.StepListener):
    def __init__(self):
        self.tracker = Tracker()

    def step(self, t):
        # do something at every simulaton step

        vehicleIds = traci.vehicle.getIDList()
        polygonIds = traci.polygon.getIDList()
        for vId in vehicleIds:
            for pId in polygonIds:
                self.tracker.trackVehicleDistanceInPolygon(vId, pId)

        # indicate that the step listener should stay active in the next step
        return True

    def cleanUp(self):
        print(self.tracker.vehicleDistances)

