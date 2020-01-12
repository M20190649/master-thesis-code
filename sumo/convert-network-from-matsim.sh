echo "Downloading MATSim Network data..."
cd ../matsim/network
sh download-matsim-network.sh
cd ../../sumo

echo

echo "Converting network..."
netconvert --matsim ../matsim/network/berlin-v5-network.xml -o ./matsim-network.net.xml --matsim.lanes-from-capacity=true --matsim.keep-length=true
echo "Done!"