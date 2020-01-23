cd ..

mkdir tmp

node scripts/geojson-converter.js --input sumo/test-boundary.geojson --output tmp/polygon.xml

polyconvert --xml-files tmp/polygon.xml --net-file sumo/osm-network.net.xml

rm -rf tmp
