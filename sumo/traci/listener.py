import traci, pprint
import traci.constants as tc


class StepListener(traci.StepListener):
    def __init__(self, tracker, simConfig):
        self.simConfig = simConfig
        self.tracker = tracker

    def doStaticRerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        newlyInsertedVehicles = traci.simulation.getDepartedIDList()
        for vId in newlyInsertedVehicles:
            # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

            # Check if route includes edges that are within air quality zone polygons
            route = traci.vehicle.getRoute(vId)
            edgesToAvoid = []

            for pId in self.tracker.polygonEdges:
                for eId in route:
                    if eId in self.tracker.polygonEdges[pId]:
                        edgesToAvoid.extend(self.tracker.polygonEdges[pId])
                        break

            # If the route crosses one or more polygon we need to reroute the vehicle to avoid these edges
            if len(edgesToAvoid) != 0:
                for eId in edgesToAvoid:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vId, eId, time=99999999)

                # Reroute
                # print(f"Rerouting vehicle {vId}")
                traci.vehicle.rerouteTraveltime(vId, False)

    def doDynamicRerouting(self):
        for pId in self.tracker.polygonEdges:
            vehicleContext = traci.polygon.getContextSubscriptionResults(pId)

            if vehicleContext is None:
                return

            polygonEdges = self.tracker.polygonEdges[pId]

            for vId in vehicleContext:
                # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

                vehicleData = vehicleContext[vId]
                route = traci.vehicle.getRoute(vId)
                upcomingEdges = route[vehicleData[tc.VAR_ROUTE_INDEX] :]
                # Check if vehicle route goes through polygon
                routeInPolygon = any(eId in polygonEdges for eId in upcomingEdges)
                if not routeInPolygon:
                    # If no, continue with next vehicle
                    continue

                # Check if destination is within polygon
                if upcomingEdges[-1] in polygonEdges:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print("Destination is in polygon")

                # If no, reroute
                for eId in polygonEdges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vId, eId, time=99999999)

                print(f"Rerouting vehicle {vId}")
                traci.vehicle.rerouteTraveltime(vId, False)

    def step(self, t):
        # Do something at every simulaton step
        if self.simConfig["enableRerouting"]:
            if self.simConfig["dynamicRerouting"]:
                self.doDynamicRerouting()
            else:
                self.doStaticRerouting()

        # Track all distances driven in each polygon
        vehicleIds = traci.vehicle.getIDList()
        polygonIds = traci.polygon.getIDList()
        for vId in vehicleIds:
            for pId in polygonIds:
                self.tracker.trackVehicleDistanceInPolygon(vId, pId)

        # Return true to indicate that the step listener should stay active in the next step
        return True

    def cleanUp(self):
        pprint.pprint(self.tracker.vehicleDistances)

