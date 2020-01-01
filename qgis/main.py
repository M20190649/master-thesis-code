exec(open("import.py").read())
exec(open("interpolate.py").read())

baseDirectory = "C:/Users/Mazel/Documents/University/Masterarbeit/master-thesis-code"

# Clear the project before executing the script again
QgsProject.instance().clear()

districtLayer = importDistricts()
pmLayer = importMeasurements()

interpolateMeasurements(pmLayer, districtLayer)