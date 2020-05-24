import random, pprint, glob
from functools import partial
from argparse import ArgumentParser
import geopandas as gpd
import numpy as np
from scipy.spatial import cKDTree
from sklearn.model_selection import KFold
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt

import interpolators

plt.rcParams["figure.figsize"] = 30, 20
plt.rcParams["font.size"] = 20
plt.rcParams["axes.titlesize"] = 50
plt.rcParams["axes.titlepad"] = 80

interpolator_functions = {
    "nearest-neighbor": interpolators.nearest_neighbor,
    "natural-neighbor": interpolators.discrete_natural_neighbor,
    "idw": interpolators.inverse_distance_weighting,
    "linear-rbf": partial(interpolators.radial_basis_function, function="linear"),
    "mq-rbf": partial(interpolators.radial_basis_function, function="multiquadric"),
    "imq-rbf": partial(
        interpolators.radial_basis_function, function="inverse-multiquadric"
    ),
    "thin-plate-rbf": partial(
        interpolators.radial_basis_function, function="thin-plate"
    ),
    # "kriging": interpolators.kriging,
}


def cross_validate_file(measurements_file):
    measurements = gpd.read_file(measurements_file)

    external_crs = "EPSG:4326"
    internal_crs = "EPSG:3068"

    measurements = measurements.to_crs(internal_crs)

    x = np.array(measurements.geometry.x)
    y = np.array(measurements.geometry.y)
    values = np.array(measurements.value)

    xmin, ymin, xmax, ymax = measurements.total_bounds
    size = 100  # grid cell size in meters
    xnew = np.linspace(xmin, xmax, int((xmax - xmin) / size))
    ynew = np.linspace(ymin, ymax, int((ymax - ymin) / size))

    folds = 10
    seed = random.randint(0, 9999)
    kfold = KFold(folds, True, seed)
    avg_rmse_per_method = {}
    for method in interpolator_functions:
        interpolation_method = interpolator_functions[method]
        sum_rmse = 0
        for train, test in kfold.split(values):
            train_points = np.column_stack((x[train], y[train]))
            train_values = values[train]

            interpolated_values = interpolation_method(
                x[test], y[test], train_points, train_values, grid=False
            )
            rmse = mean_squared_error(values[test], interpolated_values)
            sum_rmse += rmse

        avg_rmse = sum_rmse / folds
        avg_rmse_per_method[method] = avg_rmse

    return avg_rmse_per_method


# cross_validate_file("./validation-02-02-2020/data_2020-02-02T08-00-00.geojson")


def cross_validation(directory):
    files = glob.glob(f"{directory}/*.geojson")

    win_counter = dict.fromkeys(interpolator_functions.keys(), 0)
    for file in files:
        result = cross_validate_file(file)
        # pprint.pprint(result)
        winning_method = min(result, key=result.get)
        win_counter[winning_method] += 1

    pprint.pprint(win_counter)
    fig, ax = plt.subplots()
    x_pos = np.arange(0, len(win_counter.keys()))
    heights = list(win_counter.values())
    labels = list(win_counter.keys())

    ax.bar(x_pos, heights)
    ax.set_xticks(x_pos)
    ax.set_xticklabels(labels)
    ax.set_ylabel("No. of wins")
    ax.set_title("Interpolation method cross-validation")

    for i, h in enumerate(heights):
        margin = np.max(heights) * 0.02
        ax.text(
            x=i, y=h + margin, s=f"{h}", va="center", color="black", fontweight="bold"
        )

    fig.savefig(f"{directory}/wins.png")


parser = ArgumentParser()
parser.add_argument(
    "--directory",
    dest="directory",
    help="Directory to all GeoJSON measurement files",
    metavar="FILE",
)
args = parser.parse_args()

cross_validation(args.directory)
