IN_FILE=berlin-v5-network.xml.gz
OUT_FILE=berlin-v5-network.xml

if [ -f "$IN_FILE" ]; then
  echo "Berlin MATSim Network File exists"
else 
  echo "Berlin MATSim Network File does not exist"
  echo "Downloading now..."
  wget https://svn.vsp.tu-berlin.de/repos/public-svn/matsim/scenarios/countries/de/berlin/berlin-v5.4-10pct/input/berlin-v5-network.xml.gz -O $IN_FILE --no-check-certificate
  echo "Done!"
fi

if [ -f "$OUT_FILE" ]; then
  echo "Berlin MATSim Network XML File exists"
  echo "Done!"
else 
  echo "Berlin MATSim Network XML File does not exist"
  echo "Unzipping..."
  gunzip -c -k $IN_FILE > $OUT_FILE
  echo "Done!"
fi