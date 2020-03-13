const colorsBySource = {
  openSenseMap: "#4eaf47",
  "luftdaten.info": "#444444",
}

module.exports = function Measurement(id, value, source, latitude, longitude) {
  this.properties = {
    id,
    value,
    source,
    "marker-color": colorsBySource[source],
  }
  this.location = {
    latitude,
    longitude,
  }
}
