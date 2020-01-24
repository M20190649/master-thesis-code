import traci
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker:
    def __init__(self):
        self.vehicleDistances = {}

    def trackVehicleDistanceInPolygon(self, vId, pId):
        x, y = traci.vehicle.getPosition(vId)
        polygonShape = traci.polygon.getShape(pId)
        location = Point(x, y)
        polygon = Polygon(polygonShape)

        distance = traci.vehicle.getDistance(vId)
        if vId not in self.vehicleDistances:
            self.vehicleDistances[vId] = {"prevDistance": distance}

        if polygon.contains(location):
            if pId in self.vehicleDistances[vId]:
                self.vehicleDistances[vId][pId] += (
                    distance - self.vehicleDistances[vId]["prevDistance"]
                )
            else:
                self.vehicleDistances[vId][pId] = (
                    distance - self.vehicleDistances[vId]["prevDistance"]
                )
            print("Vehicle in polygon")
            print(self.vehicleDistances)

        self.vehicleDistances[vId]["prevDistance"] = distance

