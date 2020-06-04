const colorsBySource = {
  openSenseMap: "#4eaf47",
  "luftdaten.info": "#444444",
}

function Sensor(id, dataFilePath, source, longitude, latitude) {
  this.id = id
  this.dataFilePath = dataFilePath
  this.source = source
  this.markerColor = colorsBySource[source]
  this.longitude = parseFloat(longitude)
  this.latitude = parseFloat(latitude)
}

function Measurement(value, timestamp) {
  this.value = parseFloat(value)
  this.timestamp = timestamp
}

function SensorMeasurement(sensor, value) {
  this.sensor = sensor
  this.value = parseFloat(value)
}

module.exports = {
  Sensor,
  Measurement,
  SensorMeasurement,
}
