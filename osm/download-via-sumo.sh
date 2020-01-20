FILE_NAME=greater-berlin

echo "Downloading OSM Data..."
python $SUMO_HOME/tools/osmGet.py --bbox 12.9529,52.2942,13.9018,52.7429 --prefix $FILE_NAME
echo "Done"

echo

echo "Building OSM File..."
osmBuild.py --osm-file $FILE_NAME.osm.xml --vehicle-classes road
echo "Done"