../sumo

echo "Converting trips to routes..."
duarouter --route-files matsim-plans-trips.xml --net-file matsim-network.net.xml --output-file matsim-trip-routes.rou.xml
echo "Done"