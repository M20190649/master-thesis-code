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


def nearestNeighborInterpolator(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    result = []
    nntree = KDTree(points)

    for row in pointMatrix:
        distances, indices = nntree.query(row)
        result.append(list(map(lambda idx: values[idx], indices)))
    return np.array(result)


def inverseDistanceWeightingInterpolator(x, y, points, values, p):
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
            resultRow.append(np.sum(weights * values))
        result.append(resultRow)

    return np.array(result)


def radialBaseFunctionInterpolator(x, y, points, values):
    rbfInterpolator = interpolate.Rbf(x, y, values, function="linear")
    xx, yy = np.meshgrid(x, y)
    rbfValues = rbfInterpolator(xx, yy)
    return rbfValues


def scipyGridDataInterpolator(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    gridValues = interpolate.griddata(points, values, pointMatrix)
    return gridValues
