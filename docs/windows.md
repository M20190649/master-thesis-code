# Setup Guide for Windows

1. Clone the GitHub Repository

2. Install the latest [NodeJS](https://nodejs.org/en/) (min. v.12.x)

3. Install NodeJS dependencies

```
npm install
```

4. Install [Miniconda/Anaconda](https://docs.conda.io/en/latest/index.html)

5. Create the conda environment with all Python dependencies

```bash
conda env create -f environment-windows.yml
```

If the above does not work you can also create the environment manually

```bash
# Create a new environment and activate it
conda create --name apats-sim
conda activate apats-sim

# Add additional channel for packages
conda config --add channels conda-forge

# Install all packages
conda install numpy scipy shapely pandas geopandas matplotlib notebook scikit-learn scikit-image metpy pykrige zope.event

pip install naturalneighbor
```

6. Download and install/unpack SUMO

7. Set `SUMO_HOME` environment variable to your SUMO install directory (e.g. `C:\Users\Mazel\Desktop\sumo-1.6.0`)

8. Add the `bin` directory of your SUMO directory to the PATH variable (e.g. `C:\Users\Mazel\Desktop\sumo-1.6.0\bin`)

## Known Errors

* `Microsoft Visual C++ 14.0 is required`

  You can resolve this by installing the latest C++ Build Tool for Visual Studio from [here](https://visualstudio.microsoft.com/visual-cpp-build-tools/)