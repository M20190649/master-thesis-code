SCENARIO=$1
MODE=$2

# Determine which day should be used
DAY=""
if [[ ${SCENARIO:0:1} == "L" ]]; then
  DAY="light"
fi

if [[ ${SCENARIO:0:1} == "M" ]]; then 
  DAY="medium"
fi

if [[ ${SCENARIO:0:1} == "H" ]]; then 
  DAY="heavy"
fi

# # Delete old scenario
# rm -r scenarios/$SCENARIO

# Create scenario folder
mkdir scenarios/$SCENARIO

# Copy network and demand data
rm -r scenarios/$SCENARIO/network
cp -r scenarios/N/network scenarios/$SCENARIO/network

rm -r scenarios/$SCENARIO/demand
cp -r scenarios/N/demand scenarios/$SCENARIO/demand


mkdir scenarios/$SCENARIO/airdata
echo $MODE

if [[ $MODE == "db" ]]; then
  # Setup with DB
  echo $DAY/$DAY.sqlite
  rm -r scenarios/$SCENARIO/airdata/$DAY.sqlite
  cp $DAY/$DAY.sqlite scenarios/$SCENARIO/airdata

  # Do a prep run to make sure everything works
  node ../simulation/runSimulation.js -c scenarios/$SCENARIO.json -p --db
else
  # Copy air data from chosen day
  rm -r scenarios/$SCENARIO/airdata/PM10-raw
  cp -r $DAY/PM10-raw scenarios/$SCENARIO/airdata/PM10-raw

  rm -r scenarios/$SCENARIO/airdata/PM10-idw
  cp -r $DAY/PM10-idw scenarios/$SCENARIO/airdata/PM10-idw

  # Remove pictures of zones -> Not necessary for AWS
  rm scenarios/$SCENARIO/airdata/PM10-idw/*.png

  # Do a prep run to make sure everything works
  node ../simulation/runSimulation.js -c scenarios/$SCENARIO.json -p
fi