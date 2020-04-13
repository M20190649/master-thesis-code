const fs = require("fs")
const { join } = require("path")
const XMLBuilder = require("xmlbuilder")

const guiConfig = join(__dirname, "gui-settings.cfg")

module.exports = (
  outputDir,
  { network, routes, routesVisualization, sumoConfigFile, polygonsFile }
) => {
  const emissionsFile = join(outputDir, "emissions.xml")
  const floatingCarData = join(outputDir, "floating-car-data.xml")
  const vehicleSummary = join(outputDir, "vehicle-summary.xml")
  const tripsInfo = join(outputDir, "trips-info.xml")
  const routesInfo = join(outputDir, "routes-info.xml")

  const configXML = XMLBuilder.create("configuration")

  const inputTag = configXML.element("input")
  inputTag.element("net-file", { value: network })
  inputTag.element("route-files", { value: routes })
  // inputTag.element("additional-files", { value: routesVisualization })
  inputTag.element("gui_only").element("gui-settings-file", { value: guiConfig })

  const emissionsTag = configXML.element("emissions")
  emissionsTag.element("device.emissions.probability", { value: "1.0" })

  const outputTag = configXML.element("output")
  outputTag.element("emission-output", { value: emissionsFile })
  // outputTag.element("human-readable-time", { value: "true" })
  outputTag.element("fcd-output", { value: floatingCarData })
  outputTag.element("fcd-output.geo", { value: "true" })
  outputTag.element("summary-output", { value: vehicleSummary })
  outputTag.element("tripinfo-output", { value: tripsInfo })
  outputTag.element("vehroute-output", { value: routesInfo })
  outputTag.element("vehroute-output.sorted", { value: "true" })
  outputTag.element("vehroute-output.cost", { value: "true" })
  outputTag.element("vehroute-output.route-length", { value: "true" })
  outputTag.element("vehroute-output.intended-depart", { value: "true" })

  fs.writeFileSync(sumoConfigFile, configXML.end({ pretty: true }))
}
