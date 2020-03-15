import traci, pprint
import traci.constants as tc
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


class Tracker:
    def __init__(self, simConfig):
        self.simConfig = simConfig
        self.polygonIds = []
        self.polygonEdges = {}
        self.vehicleDistances = {}

    def addPolygonSubscriptions(self, pId):
        # Polygon context used for dynamic routing
        traci.polygon.subscribeContext(
            pId,
            tc.CMD_GET_VEHICLE_VARIABLE,
            self.simConfig["dynamicReroutingDistance"],
            [
                tc.VAR_EMISSIONCLASS,  # Distinguish between gas and electric cars. Electric cars don't need to be rerouted
                tc.VAR_ROUTE_INDEX,  # Vehicles that have their destination within the zone shouldn't be rerouted
                tc.VAR_NEXT_STOPS,
            ],
        )

    def removePolygonSubscriptions(self, pId):
        traci.polygon.unsubscribeContext(
            pId, tc.CMD_GET_VEHICLE_VARIABLE, self.simConfig["dynamicReroutingDistance"]
        )

    def updatePolygons(self):
        # Store polygon IDs
        self.polygonIds = traci.polygon.getIDList()

        for pId in self.polygonIds:
            # Store all edges that are covered by each polygon

            # Add subscription temporarily to be able to query for all edges
            # Get all edges for polygon pId that are within distance of 0
            traci.polygon.subscribeContext(
                pId, tc.CMD_GET_EDGE_VARIABLE, 0, [tc.VAR_NAME],
            )
            edgeSubscription = traci.polygon.getContextSubscriptionResults(pId)
            # Remove context subscription because we don't need it anymore
            traci.polygon.unsubscribeContext(pId, tc.CMD_GET_EDGE_VARIABLE, 0)

            if edgeSubscription is None:
                # print(f"No edge subscription for polygon {pId}")
                # Edges subscription can be None when the polygon doesn't cover any edges
                # Since it doesn't cover any edges it can be removed
                traci.polygon.remove(pId)
                continue

            # filter out some junction data
            edgesInPolygon = list(
                filter(lambda e: not e.startswith(":"), edgeSubscription.keys())
            )
            # print(f"{len(edgesInPolygon)} edges in polygon {pId}")
            self.polygonEdges[pId] = edgesInPolygon

            # Add all other necessary context subscriptions
            self.addPolygonSubscriptions(pId)

    def trackVehicleDistanceInPolygon(self, vId, pId):
        timestep = traci.polygon.getParameter(pId, "timestep")
        x, y = traci.vehicle.getPosition(vId)
        polygonShape = traci.polygon.getShape(pId)
        location = Point(x, y)
        polygon = Polygon(polygonShape)

        speed = traci.vehicle.getSpeed(vId)

        if polygon.contains(location):
            if timestep not in self.vehicleDistances:
                self.vehicleDistances[timestep] = {}

            if vId not in self.vehicleDistances[timestep]:
                self.vehicleDistances[timestep][vId] = {}

            if pId in self.vehicleDistances[timestep][vId]:
                self.vehicleDistances[timestep][vId][pId] += speed
            else:
                self.vehicleDistances[timestep][vId][pId] = 0

            print("Vehicle in polygon")
            pprint.pprint(self.vehicleDistances)

