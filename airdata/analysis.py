import os

# os.environ[
#     "PROJ_LIB"
# ] = r"C:\\ProgamData\\Miniconda3\\envs\\master-thesis\\Library\\share"

import geopandas
from shapely import geometry
import matplotlib.pyplot as plt
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
import interpolators

mode = "int"


def getMeasurementValue(value):
    if math.isnan(value):
        return 0

    if mode == "raw":
        return value

    if mode == "int":
        return int(value)

    zones = [[0, 20], [20, 40], [40, 60], [60, math.inf]]
    for i, zone in enumerate(zones):
        zoneMin, zoneMax = zone
        if value >= zoneMin and value < zoneMax:
            return zoneMin


def getPolygonsFromContour(contour):
    polygons = []
    for col in contour.collections:
        # Loop through all polygons that have the same intensity level
        for contour_path in col.get_paths():
            # Create the polygon for this intensity level
            # The first polygon in the path is the main one, the following ones are "holes"
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

            polygons.append(poly)
    return polygons


berlinDistricts = geopandas.read_file("../shared/berlinDistricts.geojson")
measurements = geopandas.read_file("data/data_2020-02-20T11-01-00.geojson")

external_crs = "EPSG:4326"
internal_crs = "EPSG:3068"

berlinDistricts = berlinDistricts.to_crs(epsg=3068)
measurements = measurements.to_crs(epsg=3068)

x = np.array(measurements.geometry.x)
y = np.array(measurements.geometry.y)
values = np.array(measurements.value)
points = np.column_stack((x, y))

xmin, ymin, xmax, ymax = measurements.total_bounds
size = 500  # grid cell size in meters
xnew = np.linspace(xmin, xmax, int((xmax - xmin) / size))
ynew = np.linspace(ymin, ymax, int((ymax - ymin) / size))

xgrid, ygrid = np.meshgrid(xnew, ynew)

start = time.time()

# iValues = interpolator.nearestNeighborInterpolator(xnew, ynew, points, values)
iValues = interpolators.scipyGridDataInterpolator(xnew, ynew, points, values)
iValues = np.array([list(map(getMeasurementValue, row)) for row in iValues])
print(iValues)

end = time.time()
print(end - start)

plt.rcParams["figure.figsize"] = 30, 20
plt.rcParams["font.size"] = 20
plt.rcParams["axes.titlesize"] = 50
plt.rcParams["axes.titlepad"] = 80

fig, ax = plt.subplots()

berlinDistricts.boundary.plot(ax=ax, edgecolor="black")

# xx, yy = np.meshgrid(xnew, ynew)
# ax.scatter(xx, yy)

plot = ax.contour(xnew, ynew, iValues, [0, 20, 40, 60, 80])

print(len(plot.collections))


# plot = ax.pcolormesh(xnew, ynew, iValues)

# fig.colorbar(plot, ax=ax)
# plt.show()

# skip first because it covers all areas with zones as holes
polygons = getPolygonsFromContour(plot)[1:]
polygons = geopandas.GeoSeries(polygons)
polygons.crs = internal_crs
polygons = polygons.to_crs(external_crs)
polygons.to_file("test.geojson", driver="GeoJSON")
