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
import naturalneighbor


def nearest_neighbor(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    point_matrix = np.dstack((xx, yy))
    grid_values = interpolate.griddata(points, values, point_matrix, method="nearest")
    return grid_values


def natural_neighbor(x, y, points, values):
    x_step_width = (x[-1] - x[0]) / x.shape[0]
    y_step_width = (y[-1] - y[0]) / y.shape[0]
    grid_ranges = [[x[0], x[-1], x_step_width], [y[0], y[-1], y_step_width], [0, 1, 1]]
    grid_values = naturalneighbor.griddata(
        np.insert(points, 2, 0, axis=1), values, grid_ranges
    )
    return np.squeeze(grid_values).T


def inverse_distance_weighting(x, y, points, values, p=2, k=6):
    # Credits to this guy: https://github.com/paulbrodersen/inverse_distance_weighting/blob/master/idw.py
    tree = cKDTree(points, leafsize=10)
    eps = 1e-6
    regularize_by = 1e-9

    grid = np.meshgrid(x, y)
    point_matrix = np.reshape(grid, (2, -1)).T

    distances, idx = tree.query(point_matrix, k, eps=eps, p=p)

    if len(idx.shape) == 1:
        distances = np.atleast_2d(distances).reshape((-1, 1))
        idx = np.atleast_2d(idx).reshape((-1, 1))

    distances += regularize_by
    neighbor_values = values[idx.ravel()].reshape(idx.shape)
    summed_inverse_distances = np.sum(1 / distances, axis=1)
    idw_values = np.sum(neighbor_values / distances, axis=1) / summed_inverse_distances
    return idw_values.reshape(grid[0].shape)


def radial_base_function(x, y, points, values):
    rbfInterpolator = interpolate.Rbf(x, y, values, function="linear")
    xx, yy = np.meshgrid(x, y)
    rbfValues = rbfInterpolator(xx, yy)
    return rbfValues


def linear_barycentric(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    point_matrix = np.dstack((xx, yy))
    grid_values = interpolate.griddata(points, values, point_matrix, method="linear")
    return grid_values


def clough_tocher(x, y, points, values):
    xx, yy = np.meshgrid(x, y)
    point_matrix = np.dstack((xx, yy))
    grid_values = interpolate.griddata(points, values, point_matrix, method="cubic")
    return grid_values
