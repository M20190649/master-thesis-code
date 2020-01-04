echo "Downloading latest Berlin OSM data..."
cd ../osm
sh download-latest-berlin.sh
cd ../sumo

echo
echo "Converting network..."
netconvert --osm-files ../osm/berlin-latest.osm.xml -o osm-network.net.xml
echo "Done!"
