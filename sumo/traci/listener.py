import traci, pprint, datetime, os
import xml.etree.ElementTree as et
import traci.constants as tc
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry import box
import geopandas as gpd


class StepListener(traci.StepListener):
    def __init__(self, tracker, sim_config):
        self.sim_config = sim_config
        self.tracker = tracker
        self.t = 0
        self.rerouted_vehicles = []

    def reroute_vehicle(self, vid):
        print(f"Rerouting vehicle {vid}")
        traci.vehicle.rerouteTraveltime(vid, False)
        traci.vehicle.setColor(vid, (255, 0, 0))
        self.rerouted_vehicles.append(vid)

    def static_rerouting(self):
        # Rerouting for vehicles whose route crosses through air quality zones
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for vid in newly_inserted_vehicles:
            # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting

            # Check if route includes edges that are within air quality zone polygons
            route = traci.vehicle.getRoute(vid)
            edges_to_avoid = []

            # If any edge is within any polygon avoid all polygon edges
            for pid in self.tracker.polygon_edges:
                for eid in route:
                    if eid in self.tracker.polygon_edges[pid]:
                        edges_to_avoid.extend(self.tracker.polygon_edges[pid])
                        break

            # If the route crosses one or more polygon we need to reroute the vehicle to avoid these edges
            if len(edges_to_avoid) != 0:
                # Check if destination is within polygon
                if route[-1] in edges_to_avoid:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print("Destination is in polygon")

                for eid in edges_to_avoid:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                # Reroute
                self.reroute_vehicle(vid)

    def dynamic_rerouting(self):
        # TODO: Do some meta info check like price sensitivity or randomly avoid rerouting
        newly_inserted_vehicles = traci.simulation.getDepartedIDList()
        for pid in self.tracker.polygon_edges:
            polygon_edges = self.tracker.polygon_edges[pid]

            # Check all the newly spawned vehicles if any of them are located within the zone
            # If yes reroute them immediately
            for vid in newly_inserted_vehicles:
                route = traci.vehicle.getRoute(vid)
                # Check if starting edge is within the polygon
                if route[0] in polygon_edges:
                    print(f"New vehicle was inserted inside polygon {pid}.")
                    for eid in polygon_edges:
                        # Set travel times for all edges to very high value
                        traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                    self.reroute_vehicle(vid)

            # Go through all polygons and get all vehicles within dynamic rerouting range
            polygon_context = traci.polygon.getContextSubscriptionResults(pid)
            if polygon_context is None:
                continue

            vehicle_ids = traci.vehicle.getIDList()
            vehicle_context = {
                k: v for (k, v) in polygon_context.items() if k in vehicle_ids
            }
            for vid in vehicle_context:
                if vid in self.rerouted_vehicles:
                    # Don't reroute vehicles that already have been rerouted
                    continue

                vehicle_data = polygon_context[vid]
                route = traci.vehicle.getRoute(vid)
                upcoming_edges = route[vehicle_data[tc.VAR_ROUTE_INDEX] :]
                # Check if any edge of vehicle route goes through polygon
                route_in_polygon = any(eid in polygon_edges for eid in upcoming_edges)
                if not route_in_polygon:
                    # If no, continue with next vehicle
                    continue

                # Check if destination is within polygon
                if upcoming_edges[-1] in polygon_edges:
                    # If yes, don't reroute (or maybe find the "cheapest" way to destination?)
                    print(f"Destination is in polygon {pid}")

                # If no, reroute
                for eid in polygon_edges:
                    # Set travel times for all edges to very high value
                    traci.vehicle.setAdaptedTraveltime(vid, eid, time=99999999)

                self.reroute_vehicle(vid)

    def split_polygon(self, shape, parts=2):
        polygon = Polygon(shape)
        (minx, miny, maxx, maxy) = polygon.bounds
        part_width = (maxx - minx) / parts
        part_shapes = []
        for i in range(parts):
            part_bbox = box(minx + i * part_width, miny, minx + (i + 1) * part_width, maxy)
            part_poly = gpd.GeoSeries(polygon.intersection(part_bbox))

            shapely_obj = part_poly[0]
            if type(shapely_obj) == MultiPolygon:
                geojson = mapping(shapely_obj)
                for p in geojson["coordinates"]:
                    part_shapes.append(list(p[0]))

            if type(shapely_obj) == Polygon:
                geojson = mapping(shapely_obj)
                part_shapes.append(list(geojson["coordinates"][0]))

        for i in range(len(part_shapes)):
            s = part_shapes.pop(0)
            if len(s) > 255:
                print(
                    "Part is still too big (more than 255 points)! Splitting again..."
                )
                splitted_parts = self.split_polygon(s)
                part_shapes.extend(splitted_parts)
            else:
                part_shapes.append(s)

        return part_shapes

    def load_polygons(self, t):
        # Remove all old polygons
        print("Removing old polygons")
        for pId in traci.polygon.getIDList():
            # print(pId)
            self.tracker.remove_polygon_subscriptions(pId)
            traci.polygon.remove(pId)

        # Add all new polygons
        date_string = "-".join(self.sim_config["simulationDate"].split(".")[::-1])
        utc = datetime.datetime.utcfromtimestamp(t)
        pad = lambda n: f"0{n}" if n < 10 else n
        time_string = f"{pad(utc.hour)}-{pad(utc.minute)}-{pad(utc.second)}"
        zone_file = f"zones_{date_string}T{time_string}.xml"
        # zone_file = f"zones_{date_string}T10-00-00.xml"
        print(f"Loading {zone_file}")
        xml_tree = et.parse(os.path.join(self.sim_config["sim_airDataDir"], zone_file))

        print("Adding new polygons")
        for child in xml_tree.getroot():
            if child.tag == "poly":
                poly_id = child.attrib["id"]
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
                    shape_parts = self.split_polygon(shape)
                    print(f"Split zone polygon into {len(shape_parts)} parts")

                    for idx, shape_part in enumerate(shape_parts):
                        part_poly_id = f"{poly_id}-{idx}"
                        traci.polygon.add(
                            part_poly_id, shape_part, color, fill=True, layer=layer,
                        )
                        traci.polygon.setParameter(part_poly_id, "zone", str(layer))
                        traci.polygon.setParameter(part_poly_id, "timestep", time_string)
                else:
                    traci.polygon.add(
                        poly_id, shape, color, fill=True, layer=layer,
                    )
                    traci.polygon.setParameter(poly_id, "zone", str(layer))
                    traci.polygon.setParameter(poly_id, "timestep", time_string)

        # Make tracker update it's polygons
        self.tracker.update_polygons()

    def step(self, t):
        # Do something at every simulaton step
        # print("step", t)
        # if nStep % 5000 == 0:
        #     print("step", nStep)
        self.t = t
        if t > 0 and t % (self.sim_config["zoneUpdateInterval"] * 60) == 0:
            # if t > 0 and t % 40 == 0:
            print("New timestep! Zones will be updated...")
            self.load_polygons(t)
            print("Done")

        if self.sim_config["enableRerouting"]:
            if self.sim_config["dynamicRerouting"]:
                self.dynamic_rerouting()
            else:
                self.static_rerouting()

        # Track all distances driven in each polygon
        vehicle_ids = traci.vehicle.getIDList()
        polygon_ids = traci.polygon.getIDList()
        for vid in vehicle_ids:
            for pid in polygon_ids:
                self.tracker.track_vehicle_distance_in_polygon(vid, pid)

        # Return true to indicate that the step listener should stay active in the next step
        return True

    def clean_up(self):
        pprint.pprint(self.tracker.vehicle_distances)
