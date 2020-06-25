# Setup Guide for Linux (Ubuntu)

1. Make sure the package list is up-to-date

```bash
sudo apt update
```

2. Install necessary compilers

```bash
sudo apt install build-essential
```

3. Install NodeJS

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source ~/.bashrc
nvm install lts/erbium
```

4. Install Miniconda

```bash
# Download + Install Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# Add Miniconda to PATH
export PATH=~/miniconda3/bin:$PATH

# Setup conda for bash
conda init bash
exec bash -l
```

5. Install SUMO

```bash
# Download and install SUMO
sudo add-apt-repository ppa:sumo/stable
sudo apt-get update
sudo apt-get install sumo sumo-tools sumo-doc

# Set SUMO_HOME environment variable
export SUMO_HOME=/usr/share/sumo
```

Alternatively you can build SUMO from source

```bash
sudo apt-get install cmake python g++ libxerces-c-dev libfox-1.6-dev libgdal-dev libproj-dev libgl2ps-dev swig

git clone --recursive https://github.com/eclipse/sumo
export SUMO_HOME="$PWD/sumo"
mkdir sumo/build/cmake-build && cd sumo/build/cmake-build
cmake ../..
make -j$(nproc)
export PATH=~/sumo/bin:$PATH
export SUMO_HOME=~/sumo
```

6. Clone the GitHub Repository

```bash
git clone https://github.com/marcelreppi/master-thesis-code
cd master-thesis-code
```

7. Install NodeJS dependencies

```bash
npm install
```

8. Create the conda environment with all Python dependencies

```bash
conda env create -f environment-ubuntu.yml
```

If the above does not work you can also create the environment manually

```bash
# Create a new environment and activate it
conda create --name apats-sim
conda activate apats-sim

# Add additional channel for packages
conda config --add channels conda-forge
conda config --set channel_priority strict

# Install all packages
conda install numpy scipy shapely pandas geopandas matplotlib notebook scikit-learn scikit-image metpy pykrige zope.event lxml black openpyxl psutil

pip install naturalneighbor
```

Make sure Python 3.x.x is callable via "python"

```bash
# If not use this
alias python=python3
```
