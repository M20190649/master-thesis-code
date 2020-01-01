def interpolateMeasurements(measurementLayer, boundaryLayer):
  print("Interpolating layer...")
  
  idwLayerData = QgsInterpolator.LayerData()
  idwLayerData.vectorLayer = measurementLayer # Set pm layer as interpolation layer
  idwLayerData.zCoordInterpolation = False # Don't use z coordinate for interpolation
  idwLayerData.interpolationAttribute = 2 # PM1 attribute has index 2 , PM2 attribute has index 3
  idwLayerData.mInputType = 1 # Use POINTS as input type

  idwInterpolator = QgsIDWInterpolator([idwLayerData]) # Use IDW interpolation engine

  # Setup export for interpolation output
  idwExportPath ="C:/Users/Mazel/Documents/University/Masterarbeit/master-thesis-code/qgis/output/interpolation-output.asc"
  boundaryRect = boundaryLayer.extent() # Use districts as boundary rectangle
  res = 1
  nCols = int( ( boundaryRect.xMaximum() - boundaryRect.xMinimum() ) / res )
  nRows = int( (boundaryRect.yMaximum() - boundaryRect.yMinimum() ) / res)

  idwOutput = QgsGridFileWriter(idwInterpolator, idwExportPath, boundaryRect, nCols, nRows)
  idwOutput.writeFile()  

  # iface.addRasterLayer(idwExportPath, "interpolation_output") 
  QgsProject.instance().addMapLayer(QgsRasterLayer(idwExportPath, ""))

  print("Interpolation layer done")