# Setup Guide for Linux (Ubuntu)

1. Clone the GitHub Repository

2. Install NodeJS

```bash
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install nodejs
```

3. Install NodeJS dependencies

```
npm install
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

5. Create the conda environment with all Python dependencies

```bash
conda env create -f environment-ubuntu18.04.yml
```

If the above does not work you can also create the environment manually

```bash
# Create a new environment and activate it
conda create --name apats-sim
conda activate apats-sim

# Add additional channel for packages
conda config --add channels conda-forge

# Install all packages
conda install numpy scipy shapely pandas geopandas matplotlib notebook scikit-learn scikit-image metpy pykrige zope.event lxml

pip install naturalneighbor

# Make sure Python 3.x.x is callable via "python"
# If not use this
alias python=python3
```

6. Install SUMO

```bash
# Download and install SUMO
sudo add-apt-repository ppa:sumo/stable
sudo apt-get update
sudo apt-get install sumo sumo-tools sumo-doc

# Set SUMO_HOME environment variable
export SUMO_HOME=/usr/share/sumo
```