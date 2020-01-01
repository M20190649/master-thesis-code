# Tranform function to transform layer into Berlin coordinate system
def transformLayer(layer):
  sourceCrs = QgsCoordinateReferenceSystem(4326)
  destCrs = QgsCoordinateReferenceSystem(3068)
  xform = QgsCoordinateTransform(sourceCrs, destCrs, QgsProject.instance())

  # QGIS nromally writes transformed coordinates to original shapefile
  # Using a memory layer to prevent modification of shapefile

  # Create a memory layer
  geometryType = ""
  if layer.geometryType() == QgsWkbTypes.PolygonGeometry:
    geometryType = "Polygon"
  elif layer.geometryType() == QgsWkbTypes.PointGeometry:
    geometryType = "Point"

  mem_layer = QgsVectorLayer(f"{geometryType}?crs=epsg:4326", layer.name(), "memory")

  # Copy attributes from original layer to memory layer
  attr = layer.dataProvider().fields().toList()
  mem_layer.dataProvider().addAttributes(attr)
  mem_layer.updateFields()

  # Apply transformation to original features
  transformedFeatures = []
  for f in layer.getFeatures():
    g = f.geometry()
    g.transform(xform)
    f.setGeometry(g)
    transformedFeatures.append(f)

  # Store transformed features in memory layer
  mem_layer.dataProvider().addFeatures(transformedFeatures)
  return mem_layer

def importDistricts():
    print("Importing District layer...")
    
    districtsFile = baseDirectory + "/berlinDistricts.geojson"

    districtLayer = QgsVectorLayer(districtsFile, "Berlin Districts", "ogr")
    
    # 1. Transform to Berlin CRS
    transformedLayer = transformLayer(districtLayer)
    
    # 2. Style layer
    props = {}
    props["color"] = "white"
    props["color_border"] = "black"
    symbol = QgsFillSymbol.createSimple(props)
    transformedLayer.renderer().setSymbol(symbol)

    # 3. Add to interface
    QgsProject.instance().addMapLayer(transformedLayer)

    print("District layer done")

    return transformedLayer
        
def importMeasurements():
    print("Importing PM layer...")
    
    pmFile = baseDirectory + "/airdata/data/luftinfo_pm_20191228-134827.geojson"
    pmLayer = QgsVectorLayer(pmFile, "PM Measurements", "ogr")
    
    # 1. Transform to Berlin CRS
    transformedLayer = transformLayer(pmLayer)

    # 2. Add to interface
    QgsProject.instance().addMapLayer(transformedLayer)

    print("PM layer done")

    return transformedLayer



