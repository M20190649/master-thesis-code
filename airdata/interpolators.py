import math, time, random, collections
from collections import defaultdict
import numpy as np
import geopandas as gpd
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
from shapely.geometry import Polygon, Point, box
from shapely.strtree import STRtree
import naturalneighbor
import metpy.interpolate as metpy_interpolate
from pykrige.ok import OrdinaryKriging
from pykrige.uk import UniversalKriging
from sklearn.model_selection import KFold
from sklearn.metrics import mean_squared_error


def regularize_points(points, eps=1e-2):
    # Looks for duplicate x and y values and regularize them
    x_duplicates = [
        item for item, count in collections.Counter(points[:, 0]).items() if count > 1
    ]
    y_duplicates = [
        item for item, count in collections.Counter(points[:, 1]).items() if count > 1
    ]

    regularize = lambda n: n + random.uniform(-eps, eps)

    fixed_x = list(
        map(lambda x: regularize(x) if x in x_duplicates else x, points[:, 0],)
    )
    fixed_y = list(
        map(lambda y: regularize(y) if y in y_duplicates else y, points[:, 1],)
    )
    return np.column_stack((fixed_x, fixed_y))


def nearest_neighbor(x, y, points, values, grid=True):
    points = regularize_points(points)

    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
    else:
        point_matrix = np.column_stack((x, y))

    grid_values = interpolate.griddata(points, values, point_matrix, method="nearest")
    return grid_values


def discrete_natural_neighbor(x, y, points, values, grid=True):
    # Natural neighbor implementation taken from Python package "naturalneighbor"
    # FASTEST IMPLEMENTATION (because it is discrete)
    points = regularize_points(points)

    if grid:
        x_step_width = (x[-1] - x[0]) / x.shape[0]
        y_step_width = (y[-1] - y[0]) / y.shape[0]
        grid_ranges = [
            [x[0], x[-1], x_step_width],
            [y[0], y[-1], y_step_width],
            [0, 1, 1],
        ]
        grid_values = naturalneighbor.griddata(
            np.insert(points, 2, 0, axis=1), values, grid_ranges
        )
        return np.squeeze(grid_values).T
    else:
        interpolated_values = []
        new_points = np.column_stack((x, y))
        for px, py in new_points:
            interpolated_value = naturalneighbor.griddata(
                np.insert(points, 2, 0, axis=1),
                values,
                [[px, px + 1, 1], [py, py + 1, 1], [0, 1, 1]],
            )
            interpolated_values.append(interpolated_value[0][0][0])
        return interpolated_values

def inverse_distance_weighting(
    x, y, points, values, power=2, cv=False, k=None, grid=True
):

    points = regularize_points(points)

    if cv:
        print("Doing CV to determine best power parameter...")
        folds = 10
        seed = random.randint(0, 9999)
        kfold = KFold(folds, True, seed)
        avg_rmse_per_power = {}
        for p in np.arange(1, 3, 0.01):
            sum_rmse = 0
            for train, test in kfold.split(values):
                train_points = points[train]
                train_values = values[train]
                test_points = points[test]
                test_values = values[test]

                tree = cKDTree(train_points)
                k = k or len(train_points)
                distances, idx = tree.query(test_points, k=k)

                inverse_distances = 1 / distances ** p
                weights = (
                    inverse_distances / np.sum(inverse_distances, axis=1)[:, np.newaxis]
                )
                neighbor_values = train_values[idx.ravel()].reshape(idx.shape)
                idw_values = np.sum(weights * neighbor_values, axis=1)
                rmse = mean_squared_error(test_values, idw_values)
                sum_rmse += rmse

            avg_rmse = sum_rmse / folds
            avg_rmse_per_power[p] = avg_rmse
            # print(f"p: {p}")
            # print(f"Avg RMSE: {avg_rmse}")

        print("Done")
        power = min(avg_rmse_per_power, key=avg_rmse_per_power.get)
        print(f"Winning lag: {power}")
        print(f"Avg RMSE: {avg_rmse_per_power[power]}")

    tree = cKDTree(points)

    if grid:
        meshgrid = np.meshgrid(x, y)
        point_matrix = np.reshape(meshgrid, (2, -1)).T
    else:
        point_matrix = np.column_stack((x, y))

    k = k or len(points)
    distances, idx = tree.query(point_matrix, k=k)

    if len(idx.shape) == 1:
        distances = np.atleast_2d(distances).reshape((-1, 1))
        idx = np.atleast_2d(idx).reshape((-1, 1))

    # Regularize distances to prevent division by 0
    regularize_by = 1e-9
    distances += regularize_by

    # Apply power parameter and inverse
    inverse_distances = 1 / distances ** power
    weights = inverse_distances / np.sum(inverse_distances, axis=1)[:, np.newaxis]
    neighbor_values = values[idx.ravel()].reshape(idx.shape)
    idw_values = np.sum(weights * neighbor_values, axis=1)

    if grid:
        return idw_values.reshape(meshgrid[0].shape)
    else:
        return idw_values


def scipy_radial_basis_function(x, y, points, values, function="linear", grid=True):
    points = regularize_points(points)

    rbfInterpolator = interpolate.Rbf(
        points[:, 0], points[:, 1], values, function=function
    )

    if grid:
        xx, yy = np.meshgrid(x, y)
        rbfValues = rbfInterpolator(xx, yy)
    else:
        rbfValues = rbfInterpolator(x, y)
    return rbfValues


# My own implementation of radial basis functions
def radial_basis_function(x, y, points, values, function="linear", eps=None, grid=True):
    points = regularize_points(points)

    pair_distances = cdist(points, points, "euclidean")

    # Regularize to prevent ill-formed problem (especially for log function in thin-plate)
    regularize_by = 1e-9
    pair_distances += regularize_by

    # Estimate shape parameter for some functions
    # Usually average euclidean distance between points is acceptable
    if eps is None:
        eps = pair_distances.mean()

    rbf_functions = {
        "linear": lambda r: r,
        "cubic": lambda r: np.power(r, 3),
        "quintic": lambda r: np.power(r, 5),
        "gaussian": lambda r: np.exp(-(np.power(eps * r, 2))),
        "multiquadric": lambda r: np.sqrt(1 + np.power(eps * r, 2)),
        "inverse-quadratic": lambda r: 1 / (1 + np.power(eps * r, 2)),
        "inverse-multiquadric": lambda r: 1 / np.sqrt(1 + np.power(eps * r, 2)),
        "thin-plate": lambda r: np.power(r, 2) * np.log(r),
    }

    rbf_pair_distances = rbf_functions[function](pair_distances)
    weights = np.linalg.solve(rbf_pair_distances, values)

    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
        new_points = point_matrix.reshape(-1, point_matrix.shape[-1])
    else:
        new_points = np.column_stack((x, y))

    point_distances = cdist(new_points, points)
    point_distances += regularize_by

    rbf_point_distances = rbf_functions[function](point_distances)
    result = np.dot(rbf_point_distances, weights)

    if grid:
        result = result.reshape(xx.shape)
    return result


def kriging(
    x,
    y,
    points,
    values,
    nlags=10,
    cv=False,
    krige_type="ordinary",
    grid=True,
    verbose=False,
):
    points = regularize_points(points)

    if cv:
        print("Doing CV to determine best number of lags...")
        folds = 10
        seed = random.randint(0, 9999)
        kfold = KFold(folds, True, seed)
        avg_rmse_per_lag = {}
        for lags in range(2, 101):
            sum_rmse = 0
            for train, test in kfold.split(values):
                train_points = points[train]
                train_values = values[train]
                test_points = points[test]
                test_values = values[test]

                krige_interpolator = None
                if krige_type == "ordinary":
                    krige_interpolator = OrdinaryKriging(
                        train_points[:, 0], train_points[:, 1], train_values, nlags=lags
                    )

                if krige_type == "universal":
                    krige_interpolator = OrdinaryKriging(
                        train_points[:, 0], train_points[:, 1], train_values, nlags=lags
                    )

                result = krige_interpolator.execute(
                    "points", test_points[:, 0], test_points[:, 1]
                )
                rmse = mean_squared_error(test_values, result[0])
                sum_rmse += rmse

            avg_rmse = sum_rmse / folds
            avg_rmse_per_lag[lags] = avg_rmse
            # print(f"lags: {lags}")
            # print(f"Avg RMSE: {avg_rmse}")

        print("Done")
        nlags = min(avg_rmse_per_lag, key=avg_rmse_per_lag.get)
        print(f"Winning lag: {nlags}")
        print(f"Avg RMSE: {avg_rmse_per_lag[nlags]}")

    krige_interpolator = None
    if krige_type == "ordinary":
        krige_interpolator = OrdinaryKriging(
            points[:, 0], points[:, 1], values, nlags=nlags, verbose=verbose
        )

    if krige_type == "universal":
        krige_interpolator = OrdinaryKriging(
            points[:, 0], points[:, 1], values, nlags=nlags, verbose=verbose
        )

    if grid:
        result = krige_interpolator.execute("grid", x, y)
    else:
        result = krige_interpolator.execute("points", x, y)

    return result[0]


# Natural neighbor implementation taken from Python package "MetPy"
# FASTER THAN scipy_natural_neighbor BUT MUCH SLOWER THAN discrete_natural_neighbor
def metpy_natural_neighbor(x, y, points, values, grid=True):
    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
        new_points = point_matrix.reshape(-1, point_matrix.shape[-1])
    else:
        new_points = np.column_stack((x, y))

    result = metpy_interpolate.natural_neighbor_to_points(points, values, new_points)

    if grid:
        return result.reshape(y.shape[0], x.shape[0])
    else:
        return result


# Natural neighbor implementation based on spatial voronoi region intersections
# THIS IS VERY SLOW!!!
def scipy_natural_neighbor(x, y, points, values, grid=True):
    def voronoi_polygons(voronoi, boundary, diameter=1000000):
        """Generate shapely.geometry.Polygon objects corresponding to the
        regions of a scipy.spatial.Voronoi object, in the order of the
        input points. The polygons for the infinite regions are large
        enough that all points within a distance 'diameter' of a Voronoi
        vertex are contained in one of the infinite polygons.

        """
        polygons = []

        centroid = voronoi.points.mean(axis=0)

        # Mapping from (input point index, Voronoi point index) to list of
        # unit vectors in the directions of the infinite ridges starting
        # at the Voronoi point and neighbouring the input point.
        ridge_direction = defaultdict(list)
        for (p, q), rv in zip(voronoi.ridge_points, voronoi.ridge_vertices):
            u, v = sorted(rv)
            if u == -1:
                # Infinite ridge starting at ridge point with index v,
                # equidistant from input points with indexes p and q.
                t = voronoi.points[q] - voronoi.points[p]  # tangent
                n = np.array([-t[1], t[0]]) / np.linalg.norm(t)  # normal
                midpoint = voronoi.points[[p, q]].mean(axis=0)
                direction = np.sign(np.dot(midpoint - centroid, n)) * n
                ridge_direction[p, v].append(direction)
                ridge_direction[q, v].append(direction)

        for i, r in enumerate(voronoi.point_region):
            region = voronoi.regions[r]
            if -1 not in region:
                # Finite region.
                polygons.append(
                    Polygon(voronoi.vertices[region]).intersection(boundary)
                )
                continue
            # Infinite region.
            inf = region.index(-1)  # Index of vertex at infinity.
            j = region[(inf - 1) % len(region)]  # Index of previous vertex.
            k = region[(inf + 1) % len(region)]  # Index of next vertex.
            if j == k:
                # Region has one Voronoi vertex with two ridges.
                dir_j, dir_k = ridge_direction[i, j]
            else:
                # Region has two Voronoi vertices, each with one ridge.
                (dir_j,) = ridge_direction[i, j]
                (dir_k,) = ridge_direction[i, k]

            # Length of ridges needed for the extra edge to lie at least
            # 'diameter' away from all Voronoi vertices.
            length = 2 * diameter / np.linalg.norm(dir_j + dir_k)

            # Polygon consists of finite part plus an extra edge.
            finite_part = voronoi.vertices[region[inf + 1 :] + region[:inf]]
            extra_edge = [
                voronoi.vertices[j] + dir_j * length,
                voronoi.vertices[k] + dir_k * length,
            ]
            polygons.append(
                Polygon(np.concatenate((finite_part, extra_edge))).intersection(
                    boundary
                )
            )

        return polygons

    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
        new_points = point_matrix.reshape(-1, point_matrix.shape[-1])
    else:
        new_points = np.column_stack((x, y))

    gs = gpd.GeoSeries([Point(p) for p in points])
    boundary = box(*gs.total_bounds)

    voronoi = Voronoi(points)
    voronoi_poly = voronoi_polygons(voronoi, boundary)

    tree = STRtree(voronoi_poly)
    poly_index_by_id = dict((id(p), i) for i, p in enumerate(voronoi_poly))

    def interpolate_point(new_point):
        new_voronoi = Voronoi([new_point, *points])
        new_voronoi_poly = voronoi_polygons(new_voronoi, boundary)
        new_point_poly = new_voronoi_poly[0]

        intersecting_polygons = tree.query(new_point_poly)
        weights = np.array(
            [
                p.intersection(new_point_poly).area / new_point_poly.area
                for p in intersecting_polygons
            ]
        )
        intersecting_values = np.array(
            [values[poly_index_by_id[id(p)]] for p in intersecting_polygons]
        )
        interpolated_value = intersecting_values.dot(weights.T)
        return interpolated_value

    interpolated_values = []
    for new_point in new_points:
        interpolated_value = interpolate_point(new_point)
        interpolated_values.append(interpolated_value)

    return np.array(interpolated_values).reshape(y.shape[0], x.shape[0])


# DO NOT USE THIS
def linear_barycentric(x, y, points, values, grid=True):
    points = regularize_points(points)

    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
    else:
        point_matrix = np.column_stack((x, y))

    grid_values = interpolate.griddata(points, values, point_matrix, method="linear")
    return grid_values


# DO NOT USE THIS
def clough_tocher(x, y, points, values, grid=True):
    points = regularize_points(points)

    if grid:
        xx, yy = np.meshgrid(x, y)
        point_matrix = np.dstack((xx, yy))
    else:
        point_matrix = np.column_stack((x, y))

    grid_values = interpolate.griddata(points, values, point_matrix, method="cubic")
    return grid_values
