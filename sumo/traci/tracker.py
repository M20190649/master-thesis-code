import traci, pprint
import traci.constants as tc
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker:
    def __init__(self):
        self.polygonIds = []
        self.polygonEdges = {}
        self.vehicleDistances = {}

    def updatePolygons(self):
        self.polygonIds = traci.polygon.getIDList()

        for pId in self.polygonIds:
            traci.polygon.subscribeContext(
                pId, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.VAR_NAME],
            )
            edgeSubscription = traci.polygon.getContextSubscriptionResults(pId)
            # filter out some junction data
            edgesInPolygon = list(
                filter(lambda e: not e.startswith(":"), edgeSubscription.keys())
            )
            self.polygonEdges[pId] = edgesInPolygon

    def trackVehicleDistanceInPolygon(self, vId, pId):
        x, y = traci.vehicle.getPosition(vId)
        polygonShape = traci.polygon.getShape(pId)
        location = Point(x, y)
        polygon = Polygon(polygonShape)

        speed = traci.vehicle.getSpeed(vId)

        if polygon.contains(location):
            if vId not in self.vehicleDistances:
                self.vehicleDistances[vId] = {}

            if pId in self.vehicleDistances[vId]:
                self.vehicleDistances[vId][pId] += speed
            else:
                self.vehicleDistances[vId][pId] = 0

            print("Vehicle in polygon")
            pprint.pprint(self.vehicleDistances)

