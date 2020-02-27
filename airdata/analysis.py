import os

# os.environ[
#     "PROJ_LIB"
# ] = r"C:\\ProgamData\\Miniconda3\\envs\\master-thesis\\Library\\share"

import math
import geopandas
import matplotlib.pyplot as pyplot
from scipy import interpolate
from scipy.spatial import (
    Voronoi,
    voronoi_plot_2d,
    Delaunay,
    delaunay_plot_2d,
    ConvexHull,
    convex_hull_plot_2d,
    KDTree,
)
import numpy as np

berlinDistricts = geopandas.read_file("../shared/berlinDistricts.geojson")
measurements = geopandas.read_file("data/data_2020-02-20T11-01-00.geojson")

berlinDistricts = berlinDistricts.to_crs(epsg=3068)
measurements = measurements.to_crs(epsg=3068)

x = np.array(measurements.geometry.x)
y = np.array(measurements.geometry.y)
values = np.array(measurements.value)
points = np.column_stack((x, y))

xmin, ymin, xmax, ymax = measurements.total_bounds
xnew = np.linspace(xmin, xmax, 300)
ynew = np.linspace(ymin, ymax, 300)

xgrid, ygrid = np.meshgrid(xnew, ynew)


def getMeasurementValue(index):

    value = values[index]

    # return value

    zones = [[0, 20], [20, 40], [40, 60], [60, math.inf]]
    for i, zone in enumerate(zones):
        zoneMin, zoneMax = zone
        if value >= zoneMin and value < zoneMax:
            return zoneMin


def nearestNeighborInterpolator(x, y):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    result = []
    nntree = KDTree(points)

    for row in pointMatrix:
        distances, indices = nntree.query(row)
        result.append(list(map(getMeasurementValue, indices)))

    return np.array(result)


nnvalues = nearestNeighborInterpolator(xnew, ynew)

print(nnvalues)
