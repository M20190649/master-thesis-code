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
    cKDTree,
)
from scipy.spatial.distance import euclidean
import numpy as np
import math, time


def nearestNeighborInterpolator(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    gridValues = interpolate.griddata(points, values, pointMatrix, method="nearest")
    return gridValues


def natural_neighbor(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    gridValues = naturalneighbor.griddata(points, values, pointMatrix)
    return gridValues


def inverse_distance_weighting(x, y, points, values, p=2, k=6):
    # Credits to this guy: https://github.com/paulbrodersen/inverse_distance_weighting/blob/master/idw.py
    tree = cKDTree(points, leafsize=10)
    eps = 1e-6
    regularize_by = 1e-9

    grid = np.meshgrid(x, y)
    pointMatrix = np.reshape(grid, (2, -1)).T

    distances, idx = tree.query(pointMatrix, k, eps=eps, p=p)

    if len(idx.shape) == 1:
        distances = np.atleast_2d(distances).reshape((-1, 1))
        idx = np.atleast_2d(idx).reshape((-1, 1))

    distances += regularize_by
    neighbor_values = values[idx.ravel()].reshape(idx.shape)
    summedInverseDistances = np.sum(1 / distances, axis=1)
    idw_values = np.sum(neighbor_values / distances, axis=1) / summedInverseDistances
    return idw_values.reshape(grid[0].shape)


def radialBaseFunctionInterpolator(x, y, points, values):
    rbfInterpolator = interpolate.Rbf(x, y, values, function="linear")
    xx, yy = np.meshgrid(x, y)
    rbfValues = rbfInterpolator(xx, yy)
    return rbfValues


def linearBarycentricInterpolation(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    pointMatrix = np.dstack((xx, yy))
    gridValues = interpolate.griddata(points, values, pointMatrix, method="linear")
    return gridValues
