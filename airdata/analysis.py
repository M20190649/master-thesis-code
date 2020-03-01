import os

# os.environ[
#     "PROJ_LIB"
# ] = r"C:\\ProgamData\\Miniconda3\\envs\\master-thesis\\Library\\share"

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
    distance_matrix,
)
from scipy.spatial.distance import euclidean
import numpy as np
import math, time

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


zones = [[0, 20], [20, 40], [40, 60], [60, math.inf]]


def getMeasurementValue(value):
    # return value

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

        result.append(list(map(lambda idx: getMeasurementValue(values[idx]), indices)))
    return np.array(result)


def inverseDistanceWeightingInterpolator(x, y, p):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    result = []

    weights = []
    for row in pointMatrix:
        resultRow = []
        for fakePoint in row:
            inverseDistances = np.array(
                [
                    1 / np.power(euclidean(fakePoint, realPoint), p)
                    for realPoint in points
                ]
            )
            summedInverseDistances = np.sum(inverseDistances)
            weights = inverseDistances / summedInverseDistances
            resultRow.append(getMeasurementValue(np.sum(weights * values)))
        result.append(resultRow)

    return np.array(result)


def radialBaseFunctionInterpolator(x, y):
    rbfInterpolator = interpolate.Rbf(x, y, values, function="linear")
    xx, yy = np.meshgrid(xnew, ynew)
    return rbfInterpolator(xx, yy)


def scipyGridDataInterpolator(x, y):
    xx, yy = np.meshgrid(xnew, ynew)
    pointMatrix = np.dstack((xx, yy))
    gridValues = interpolate.griddata(points, values, pointMatrix)
    return np.array([list(map(getMeasurementValue, row)) for row in gridValues])


iValues = nearestNeighborInterpolator(xnew, ynew)
iValues = inverseDistanceWeightingInterpolator(xnew, ynew, 2)

print(iValues)
