import sys
from argparse import ArgumentParser
from lxml import etree

def get_trips(file_path):
    class TripParser:
        def __init__(self):
            self.trips = []
            self.current_trip = {}


        def start(self, tag, attr):
            if tag == "tripinfo":
                self.current_trip["id"] = attr["id"]
                self.current_trip["duration"] = float(attr["duration"])
                self.current_trip["routeLength"] = float(attr["routeLength"])
                self.current_trip["rerouteNo"] = float(attr["rerouteNo"])

            if tag == "emissions":
                self.current_trip["emissions"] = attr

        def end(self, tag):
            if tag == "tripinfo":
                self.trips.append(self.current_trip)
                self.current_trip = {}

        def close(self):
            pass

    trip_parser = TripParser()
    xml_parser = etree.XMLParser(target=trip_parser)
    etree.parse(file_path, parser=xml_parser)

    return trip_parser.trips

