cd ../sumo

echo "Converting network..."
netconvert --osm-files ../osm/ernst-reuter.osm.xml -o osm-network.net.xml --geometry.remove --ramps.guess --junctions.join --tls.guess-signals --tls.discard-simple --tls.join --roundabouts.guess
echo "Done!"
