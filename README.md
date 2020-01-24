# Master Thesis Code

## Thesis Topic: Traffic Simulation for an Air Pollution-aware Toll System with Dynamic Charging

A collection of all code used for my master thesis

## Setup for Windows

### General Requirements

* Python 64bit
* NodeJS
* Linux shell (All shell scripts are written in bash) 
* If you use Git Bash add the command `wget` for it ([Install Instructions](https://gist.github.com/evanwill/0207876c3243bbb6863e65ec5dc3f058#wget))

### SUMO (TraCI)

1. Download and install/unpack SUMO
2. Set `SUMO_HOME` environment variable to your SUMO install directory (e.g. `C:\Users\Mazel\Desktop\sumo-1.4.0`)
3. Add the `bin` directory of your SUMO directory to the PATH variable (e.g. `C:\Users\Mazel\Desktop\sumo-1.4.0\bin`)
4. Execute in project root: `pip install -r requirements.txt`