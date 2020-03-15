import traci, pprint, datetime, os
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd


class StepListener(traci.StepListener):
    def __init__(self, tracker, simConfig):
        self.simConfig = simConfig
        self.tracker = tracker
        self.t = 0
        self.reroutedVehicles = []

    def rerouteVehicle(self, vId):
        print(f"Rerouting vehicle {vId}")
        traci.vehicle.rerouteTraveltime(vId, False)
        traci.vehicle.setColor(vId, (255, 0, 0))
        self.reroutedVehicles.append(vId)

    def doStaticRerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        newlyInsertedVehicles = traci.simulation.getDepartedIDList()
        for vId in newlyInsertedVehicles:
            # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

            # Check if route includes edges that are within air quality zone polygons
            route = traci.vehicle.getRoute(vId)
            edgesToAvoid = []

            # If any edge is within any polygon avoid all polygon edges
            for pId in self.tracker.polygonEdges:
                for eId in route:
                    if eId in self.tracker.polygonEdges[pId]:
                        edgesToAvoid.extend(self.tracker.polygonEdges[pId])
                        break

            # If the route crosses one or more polygon we need to reroute the vehicle to avoid these edges
            if len(edgesToAvoid) != 0:
                # Check if destination is within polygon
                if route[-1] in edgesToAvoid:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print("Destination is in polygon")

                for eId in edgesToAvoid:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vId, eId, time=99999999)

                # Reroute
                self.rerouteVehicle(vId)

    def doDynamicRerouting(self):
        # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting
        newlyInsertedVehicles = traci.simulation.getDepartedIDList()
        for pId in self.tracker.polygonEdges:
            polygonEdges = self.tracker.polygonEdges[pId]

            # Check all the newly spawned vehicles if any of them are located within the zone
            # If yes reroute them immediately
            for vId in newlyInsertedVehicles:
                route = traci.vehicle.getRoute(vId)
                # Check if starting edge is within the polygon
                if route[0] in polygonEdges:
                    print(f"New vehicle was inserted inside polygon {pId}.")
                    for eId in polygonEdges:
                        # Set travel times for all edges to very high value
                        traci.vehicle.setAdaptedTraveltime(vId, eId, time=99999999)

                    self.rerouteVehicle(vId)

            # Go through all polygons and get all vehicles within dynamic rerouting range
            polygonContext = traci.polygon.getContextSubscriptionResults(pId)
            if polygonContext is None:
                continue

            vehicleIds = traci.vehicle.getIDList()
            vehicleContext = {
                k: v for (k, v) in polygonContext.items() if k in vehicleIds
            }
            for vId in vehicleContext:
                if vId in self.reroutedVehicles:
                    # Don't reroute vehicles that already have been rerouted
                    continue

                vehicleData = polygonContext[vId]
                route = traci.vehicle.getRoute(vId)
                upcomingEdges = route[vehicleData[tc.VAR_ROUTE_INDEX] :]
                # Check if any edge of vehicle route goes through polygon
                routeInPolygon = any(eId in polygonEdges for eId in upcomingEdges)
                if not routeInPolygon:
                    # If no, continue with next vehicle
                    continue

                # Check if destination is within polygon
                if upcomingEdges[-1] in polygonEdges:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print(f"Destination is in polygon {pId}")

                # If no, reroute
                for eId in polygonEdges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vId, eId, time=99999999)

                self.rerouteVehicle(vId)

    def splitPolygon(self, shape, parts=2):
        polygon = Polygon(shape)
        (minx, miny, maxx, maxy) = polygon.bounds
        partWidth = (maxx - minx) / parts
        partShapes = []
        for i in range(parts):
            partBbox = box(minx + i * partWidth, miny, minx + (i + 1) * partWidth, maxy)
            partPoly = gpd.GeoSeries(polygon.intersection(partBbox))

            shapelyObj = partPoly[0]
            if type(shapelyObj) == MultiPolygon:
                geojson = mapping(shapelyObj)
                for p in geojson["coordinates"]:
                    partShapes.append(list(p[0]))

            if type(shapelyObj) == Polygon:
                geojson = mapping(shapelyObj)
                partShapes.append(list(geojson["coordinates"][0]))

        for i in range(len(partShapes)):
            s = partShapes.pop(0)
            if len(s) > 255:
                print(
                    "Part is still too big (more than 255 points)! Splitting again..."
                )
                splittedParts = self.splitPolygon(s)
                partShapes.extend(splittedParts)
            else:
                partShapes.append(s)

        return partShapes

    def loadPolygons(self, t):
        # Remove all old polygons
        print("Removing old polygons")
        for pId in traci.polygon.getIDList():
            # print(pId)
            self.tracker.removePolygonSubscriptions(pId)
            traci.polygon.remove(pId)

        # Add all new polygons
        dateString = "-".join(self.simConfig["simulationDate"].split(".")[::-1])
        utc = datetime.datetime.utcfromtimestamp(t)
        pad = lambda n: f"0{n}" if n < 10 else n
        timeString = f"{pad(utc.hour)}-{pad(utc.minute)}-{pad(utc.second)}"
        zoneFile = f"zones_{dateString}T{timeString}.xml"
        # zoneFile = f"zones_{dateString}T10-00-00.xml"
        print(f"Loading {zoneFile}")
        xmlTree = et.parse(os.path.join(self.simConfig["sim_airDataDir"], zoneFile))

        print("Adding new polygons")
        for child in xmlTree.getroot():
            if child.tag == "poly":
                polyId = child.attrib["id"]
                shape = list(
                    map(
                        lambda pair: tuple(map(float, pair.split(","))),
                        child.attrib["shape"].split(" "),
                    )
                )
                color = list(map(int, child.attrib["color"].split(",")))
                layer = int(float(child.attrib["layer"]))
                if len(shape) > 255:
                    print(
                        f"Warning: Zone polygon is too large ({len(shape)} points) (SUMO can't handle polygons with more than 255 points)"
                    )
                    print("Splitting zone polygon into multiple parts...")
                    shapeParts = self.splitPolygon(shape)
                    print(f"Split zone polygon into {len(shapeParts)} parts")

                    for idx, shapePart in enumerate(shapeParts):
                        partPolyId = f"{polyId}-{idx}"
                        traci.polygon.add(
                            partPolyId, shapePart, color, fill=True, layer=layer,
                        )
                        traci.polygon.setParameter(partPolyId, "zone", str(layer))
                        traci.polygon.setParameter(partPolyId, "timestep", timeString)
                else:
                    traci.polygon.add(
                        polyId, shape, color, fill=True, layer=layer,
                    )
                    traci.polygon.setParameter(polyId, "zone", str(layer))
                    traci.polygon.setParameter(polyId, "timestep", timeString)

        # Make tracker update it's polygons
        self.tracker.updatePolygons()

    def step(self, t):
        # Do something at every simulaton step
        # print("step", t)
        # if nStep % 5000 == 0:
        #     print("step", nStep)
        self.t = t
        if t > 0 and t % (self.simConfig["zoneUpdateInterval"] * 60) == 0:
            # if t > 0 and t % 40 == 0:
            print("New timestep! Zones will be updated...")
            self.loadPolygons(t)
            print("Done")

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

