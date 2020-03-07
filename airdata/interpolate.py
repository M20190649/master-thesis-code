# os.environ[
#     "PROJ_LIB"
# ] = r"C:\\ProgamData\\Miniconda3\\envs\\master-thesis\\Library\\share"

import os, math, time, ntpath
from argparse import ArgumentParser
import geopandas as gpd
import pandas as pd
from shapely import geometry
import matplotlib.pyplot as plt
import numpy as np

import interpolators


def get_polygons_from_contour(contour):
    polygons_per_zone = []

    for col in contour.collections:
        zone_polygons = []
        # Loop through all polygons that have the same intensity level
        for contour_path in col.get_paths():

            # Create the polygon for this intensity level
            # The first polygon in the path is the main one, the following ones are "holes"
            poly = None
            for idx, poly_coords in enumerate(contour_path.to_polygons()):
                x = poly_coords[:, 0]
                y = poly_coords[:, 1]

                new_shape = geometry.Polygon(
                    [(point[0], point[1]) for point in zip(x, y)]
                )

                if idx == 0:
                    poly = new_shape
                else:
                    # Remove the holes if there are any
                    poly = poly.difference(new_shape)
                    # Can also be left out if you want to include all rings

            if poly is not None:
                zone_polygons.append(poly)
        polygons_per_zone.append(zone_polygons)
    return polygons_per_zone


def interpolate(
    measurements_fp=None,
    cellsize=100,
    method="nearest_neighbor",
    output="interpolation-data",
    zones=[0, 20, 40, 100, 200, 400],  # Took these values for PM10 from Umweltbundesamt
    visualize=False,
):
    berlin_districts = gpd.read_file("../shared/berlinDistricts.geojson")
    measurements = gpd.read_file(measurements_fp)

    external_crs = "EPSG:4326"
    internal_crs = "EPSG:3068"

    berlin_districts = berlin_districts.to_crs(epsg=3068)
    measurements = measurements.to_crs(epsg=3068)

    x = np.array(measurements.geometry.x)
    y = np.array(measurements.geometry.y)
    values = np.array(measurements.value)
    points = np.column_stack((x, y))

    xmin, ymin, xmax, ymax = measurements.total_bounds
    size = int(cellsize)  # grid cell size in meters
    xnew = np.linspace(xmin, xmax, int((xmax - xmin) / size))
    ynew = np.linspace(ymin, ymax, int((ymax - ymin) / size))

    start = time.time()

    interpolator = interpolator_functions[method]
    interpolated_values = interpolator(xnew, ynew, points, values)

    end = time.time()
    print(end - start)

    contour = plt.contourf(xnew, ynew, interpolated_values, zones)
    # plt.show()

    polygons = gpd.GeoDataFrame()

    # Skip first zone because it covers the whole area with holes where the actual zones are
    polygons_per_zone = get_polygons_from_contour(contour)[1:]
    for zone, zone_polygons in enumerate(polygons_per_zone):
        for polygon in zone_polygons:
            polygon_df = gpd.GeoDataFrame({"zone": [zone], "geometry": [polygon]})
            polygons = pd.concat([polygons, polygon_df])

    polygons.crs = internal_crs
    polygons = polygons.to_crs(external_crs)

    if not os.path.isdir(output):
        os.mkdir(output)

    filename = "".join(ntpath.basename(measurements_fp).split(".")[0:-1])
    polygons.to_file(f"{output}/zones_{filename}.geojson", driver="GeoJSON")

    if visualize:
        plt.rcParams["figure.figsize"] = 30, 20
        plt.rcParams["font.size"] = 20
        plt.rcParams["axes.titlesize"] = 50
        plt.rcParams["axes.titlepad"] = 80

        fig, ax = plt.subplots()
        berlin_districts.boundary.plot(ax=ax, edgecolor="black")
        plot = ax.contourf(xnew, ynew, interpolated_values, zones, cmap="winter_r")
        plot.cmap.set_under("w")
        plot.set_clim(zones[1])
        fig.colorbar(plot, ax=ax)

        plt.savefig(f"{output}/zones_{filename}.png")

        # plt.show()
        # plt.close()


interpolator_functions = {
    "nearest_neighbor": interpolators.nearest_neighbor,
    "natural_neighbor": interpolators.natural_neighbor,
    "idw": interpolators.inverse_distance_weighting,
    "linear_barycentric": interpolators.linear_barycentric,
}

parser = ArgumentParser()
parser.add_argument(
    "--measurements",
    dest="measurements_fp",
    help="Filepath to the GeoJSON measurements file",
    metavar="FILE",
)
parser.add_argument(
    "--cellsize",
    dest="cellsize",
    help="Width/Height of the interpolated cell in meters",
    metavar="INTEGER",
)

possible_methods = ", ".join(interpolator_functions.keys())
parser.add_argument(
    "--method",
    dest="method",
    help=f"Interpolation method to use. Possible values are {possible_methods}",
    metavar="STRING",
)
parser.add_argument(
    "--zones",
    dest="zones",
    help="CSV that determine the different pollutant levels for each zone. Example: zones=0,20,40,60,80,100",
    metavar="CSV",
)
parser.add_argument(
    "--output", dest="output", help="Filepath for output files", metavar="FILE",
)
parser.add_argument(
    "--visualize",
    dest="visualize",
    help="Create visualizations of the interpolated data",
    metavar="BOOLEAN",
)

args = parser.parse_args()

args.measurements_fp = "data/data_2020-02-20T11-01-00.geojson"
args.visualize = True
args.output = "test"

# Filter None arguments
args = {k: v for k, v in vars(args).items() if v is not None}

print(args)

if "measurements_fp" not in args:
    raise ValueError("Filepath to GeoJSON measurements file must be given")

if "method" in args:
    if args["method"] not in interpolator_functions.keys():
        raise ValueError(
            f"Unknown interpolation method: {args['method']}. Available methods are {possible_methods}."
        )

if "zones" in args:
    args["zones"] = list(map(int, args["zones"].split(",")))

if "visualize" in args:
    args["visualize"] = bool(args["visualize"])

interpolate(**args)
