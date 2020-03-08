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
from scipy.spatial.distance import euclidean, cdist
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


def rbf(x, y, points, values):
    x_point_dup = [
        item for item, count in collections.Counter(points[:, 0]).items() if count > 1
    ]
    y_point_dup = [
        item for item, count in collections.Counter(points[:, 1]).items() if count > 1
    ]
    fixed_x = list(
        map(
            lambda x: x + random.uniform(-0.00001, 0.00001) if x in x_point_dup else x,
            points[:, 0],
        )
    )
    fixed_y = list(
        map(
            lambda y: y + random.uniform(-0.00001, 0.00001) if y in y_point_dup else y,
            points[:, 1],
        )
    )

    fixed_points = np.column_stack((fixed_x, fixed_y))

    method = "linear"
    c = 0.1  # shape parameter

    rbf_functions = {
        "linear": lambda r: r,
        "cubic": lambda r: np.power(r, 3),
        "gaussian": lambda r: np.exp(-(np.power(c * r, 2))),
        "multiquadric": lambda r: np.sqrt(1 + np.power(c * r, 2)),
        "inverse-quadratic": lambda r: 1 / (1 + np.power(c * r, 2)),
        "inverse-multiquadric": lambda r: 1 / np.sqrt(1 + np.power(c * r, 2)),
    }

    pair_distances = cdist(fixed_points, fixed_points, "euclidean")
    pair_distances = rbf_functions[method](pair_distances)
    weights = np.linalg.solve(pair_distances, values)

    grid = np.meshgrid(x, y)
    new_points = np.reshape(grid, (2, -1)).T
    point_distances = cdist(new_points, points)
    point_distances = rbf_functions[method](point_distances)
    result = np.dot(point_distances, weights).reshape(grid[0].shape)
    # print(result)
    # print(points.shape)
    # print(pair_distances.shape)
    # print(weights.shape)

    # TODO: Something is still wrong...
    return result
