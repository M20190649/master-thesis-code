cd ../osm

IN_FILE=berlin-latest.osm.bz2
OUT_FILE=berlin-latest.osm.xml

if [ -f "$IN_FILE" ]; then
  echo "Latest Berlin OSM File exists"
else 
  echo "Latest Berlin OSM File does not exist"
  echo "Downloading now..."
  wget http://download.geofabrik.de/europe/germany/berlin-latest.osm.bz2 -O $IN_FILE
  echo "Done!"
fi

if [ -f "$OUT_FILE" ]; then
  echo "Latest Berlin XML File exists"
  echo "Done!"
else 
  echo "Latest Berlin XML File does not exist"
  echo "Unzipping..."
  bunzip2 -c -k $IN_FILE > $OUT_FILE
  echo "Done!"
fi

