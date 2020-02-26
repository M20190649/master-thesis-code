import os

os.environ[
    "PROJ_LIB"
] = r"C:\\ProgramData\\Miniconda3\\envs\\master-thesis\\Library\\share"

import geopandas
import matplotlib.pyplot as pyplot

# from scipy import interpolate
import numpy as np

berlinDistricts = geopandas.read_file("../shared/berlinDistricts.geojson")
print(berlinDistricts.crs)
berlinDistricts.to_crs(epsg=3068, inplace=True)
print(berlinDistricts.crs)
