const runBash = require("./runBash")

runBash(
  "netconvert --osm-files ../osm/ernst-reuter.osm.xml -o ../sumo/ernst-reuter-network.net.xml"
)
