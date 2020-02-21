import traci, pprint


class StepListener(traci.StepListener):
    def __init__(self, tracker):
        self.tracker = tracker

    def step(self, t):
        # Do something at every simulaton step

        # Rerouting for vehicles whose route crosses through air quality zones
        newlyInsertedVehicles = traci.simulation.getDepartedIDList()
        for vId in newlyInsertedVehicles:
            # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

            # Check if route includes edges that are within air quality zone polygons
            route = traci.vehicle.getRoute(vId)
            edgesToAvoid = []

            for pId in self.tracker.polygonEdges:
                for edgeId in route:
                    if edgeId in self.tracker.polygonEdges[pId]:
                        edgesToAvoid.extend(self.tracker.polygonEdges[pId])
                        break

            # If the route crosses one or more polygon we need to reroute the vehicle to avoid these edges
            if len(edgesToAvoid) != 0:
                for edgeId in edgesToAvoid:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vId, edgeId, time=99999999)

                # Reroute
                # print(f"Rerouting vehicle {vId}")
                traci.vehicle.rerouteTraveltime(vId, False)

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

