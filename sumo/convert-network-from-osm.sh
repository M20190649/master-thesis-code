echo "Downloading latest Berlin OSM data..."
cd ../osm
sh download-latest-berlin.sh
cd ../sumo

echo
echo "Converting network..."
netconvert --osm-files ../osm/berlin-latest.osm.xml -o osm-network.net.xml --geometry.remove --ramps.guess --junctions.join --tls.guess-signals --tls.discard-simple --tls.join --roundabouts.guess
echo "Done!"
