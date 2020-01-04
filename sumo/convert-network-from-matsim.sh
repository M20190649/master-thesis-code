echo "Downloading MATSim Network data..."
cd ../matsim
sh download-matsim-network.sh
cd ../sumo

echo
echo "Converting network..."
netconvert --matsim ../matsim/berlin-v5-network.xml -o ./matsim-network.net.xml --matsim.lanes-from-capacity=true
echo "Done!"