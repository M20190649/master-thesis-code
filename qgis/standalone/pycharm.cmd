@echo off
SET OSGEO4W_ROOT=C:\OSGeo4W64
call "%OSGEO4W_ROOT%\bin\o4w_env.bat

@echo off
set PATH=%PATH%;%OSGEO4W_ROOT%\apps\qgis\bin
set PATH=%PATH%;%OSGEO4W_ROOT%\apps\grass\grass78\lib
set PATH=%PATH%;%OSGEO4W_ROOT%\apps\Qt5\bin
set PATH=%PATH%;%OSGEO4W_ROOT%\apps\Python37\Scripts

set PYTHONPATH=%PYTHONPATH%;%OSGEO4W_ROOT%\apps\qgis\python
set PYTHONHOME=%OSGEO4W_ROOT%\apps\Python37
set QT_QPA_PLATFORM_PLUGIN_PATH=%OSGEO4W_ROOT%\apps\Qt5\plugins

set PATH=C:\Program Files\Git\bin;%PATH%

start "PyCharm aware of QGIS" /B "C:\Program Files\JetBrains\PyCharm Community Edition 2019.3.1\bin\pycharm64.exe" %*