# os.environ[
#     "PROJ_LIB"
# ] = r"C:\\ProgamData\\Miniconda3\\envs\\master-thesis\\Library\\share"

import os, math, time, ntpath, pprint, json, itertools
from argparse import ArgumentParser
import geopandas as gpd
import pandas as pd
from shapely import geometry
import matplotlib.pyplot as plt
import numpy as np
from skimage import measure

import interpolators

plt.rcParams["figure.figsize"] = 30, 20
plt.rcParams["font.size"] = 20
plt.rcParams["axes.titlesize"] = 50
plt.rcParams["axes.titlepad"] = 80


def get_polygons_per_zone_plt(xnew, ynew, interpolated_values, zones):
    fig, ax = plt.subplots()
    contour = ax.contourf(xnew, ynew, interpolated_values, zones, cmap="winter_r")
    plt.close()

    polygons_per_zone = []

    for col in contour.collections:
        zone_polygons = []
        # Loop through all polygons that have the same intensity level
        for contour_path in col.get_paths():

            # Create the polygon for this intensity level
            # The first polygon in the path is the main one, the following ones are "holes"
            poly = None
            for idx, poly_coords in enumerate(contour_path.to_polygons()):
                poly_coords = np.array(poly_coords)
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

def get_polygons_per_zone(xnew, ynew, interpolated_values, zones):
    xmin = np.min(xnew)
    xmax = np.max(xnew)
    ymin = np.min(ynew)
    ymax = np.max(ynew)
    scale_x = lambda x: xmin + (xmax-xmin)/len(xnew)*(x+0.5)
    scale_y = lambda y: ymin + (ymax-ymin)/len(ynew)*(y+0.5)

    polygons_per_zone = []

    # Iterate in reverse to go from most inner zones to outer zones
    # Makes it easier for hole detections
    for zone, zone_limit in enumerate(zones[::-1]):
        contours = measure.find_contours(interpolated_values, zone_limit)
        contour_polygons = list(map(lambda c: geometry.Polygon(zip(scale_x(c[:, 1]), scale_y(c[:, 0]))), contours))
        
        previous_polygons = list(itertools.chain(*polygons_per_zone))
        zone_polygons = []
        holes = []

        for p1 in contour_polygons:
            if p1 in holes:
                continue

            # Check for holes in this current contour
            for p2 in contour_polygons:
                if p1 == p2:
                    continue

                if p1.contains(p2):
                    p1 = p1.difference(p2)
                    holes.append(p2)
            
            # Check if inner contours are holes in current polygon
            for p2 in previous_polygons:
                if p1.contains(p2):
                    p1 = p1.difference(p2)
                    holes.append(p2)
            
            zone_polygons.append(p1)
        polygons_per_zone.append(zone_polygons)
    # Reverse again to return polygons in same order as input zones
    return polygons_per_zone[::-1]


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

    berlin_districts = berlin_districts.to_crs(internal_crs)
    measurements = measurements.to_crs(internal_crs)

    x = np.array(measurements.geometry.x)
    y = np.array(measurements.geometry.y)
    values = np.array(measurements.value)
    points = np.column_stack((x, y))

    xmin, ymin, xmax, ymax = measurements.total_bounds
    size = int(cellsize)  # grid cell size in meters
    xnew = np.linspace(xmin, xmax, int((xmax - xmin) / size))
    ynew = np.linspace(ymin, ymax, int((ymax - ymin) / size))

    interpolator = interpolator_functions[method]

    print("Interpolating grid...")
    start = time.time()

    interpolated_values = interpolator(xnew, ynew, points, values)

    end = time.time()
    print(f"Done! ({format(end - start, '.3f')}s)")

    print("Extracting zone polygons...")
    start = time.time()

    # polygons_per_zone = get_polygons_per_zone_plt(xnew, ynew, interpolated_values, zones)
    polygons_per_zone = get_polygons_per_zone(xnew, ynew, interpolated_values, zones)

    end = time.time()
    print(f"Done! ({format(end - start, '.3f')}s)")

    print("Writing polygons into GeoJSON file...")
    start = time.time()

    polygons_df = gpd.GeoDataFrame()
    # Skip first zone because it is irrelevant
    for idx, zone_polygons in enumerate(polygons_per_zone[1:]):
        for polygon in zone_polygons:
            temp_df = gpd.GeoDataFrame({"zone": [idx + 1], "geometry": [polygon]})
            polygons_df = pd.concat([polygons_df, temp_df])

    if len(polygons_df) != 0:
        polygons_df.crs = internal_crs
        polygons_df = polygons_df.to_crs(external_crs)

    if not os.path.isdir(output):
        os.mkdir(output)

    # Filename without file type ending
    filename = "".join(ntpath.basename(measurements_fp).split(".")[0:-1])
    filename = filename.replace("data", "zones")
    if len(polygons_df) != 0:
        polygons_df.to_file(f"{output}/{filename}.geojson", driver="GeoJSON")
    else:
        with open(f"{output}/{filename}.geojson", "w", encoding="utf-8") as f:
            json.dump(
                {"type": "FeatureCollection", "features": []},
                f,
                ensure_ascii=False,
                indent=4,
            )

    end = time.time()
    print(f"Done! ({format(end - start, '.3f')}s)")

    if visualize:
        print("Creating visualization...")
        start = time.time()
        fig, ax = plt.subplots()
        contour = ax.contourf(xnew, ynew, interpolated_values, zones, cmap="winter_r")
        berlin_districts.boundary.plot(ax=ax, edgecolor="black")
        contour.cmap.set_under("w")
        contour.set_clim(zones[1])
        fig.colorbar(contour, ax=ax)
        fig.savefig(f"{output}/{filename}.png")

        end = time.time()
        print(f"Done! ({format(end - start, '.3f')}s)")

        # plt.show()
        # plt.close()


interpolator_functions = {
    "nearest_neighbor": interpolators.nearest_neighbor,
    "discrete_natural_neighbor": interpolators.discrete_natural_neighbor,
    "metpy_natural_neighbor": interpolators.metpy_natural_neighbor,
    "scipy_natural_neighbor": interpolators.scipy_natural_neighbor,
    "idw": interpolators.inverse_distance_weighting,
    "rbf": interpolators.radial_basis_function,
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

# Filter None arguments
args = {k: v for k, v in vars(args).items() if v is not None}

# print(args)

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
