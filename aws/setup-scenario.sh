mkdir scenarios/$1

cp -r scenarios/N/network scenarios/$1/network
cp -r scenarios/N/demand scenarios/$1/demand

mkdir scenarios/$1/airdata

if [[ ${1:0:1} == "L" ]]; then
  cp -r light_25-03-2020/PM10-raw scenarios/$1/airdata/PM10-raw
  cp -r light_25-03-2020/PM10-idw scenarios/$1/airdata/PM10-idw
fi

if [[ ${1:0:1} == "M" ]]; then 
  cp -r medium_11-06-2020/PM10-raw scenarios/$1/airdata/PM10-raw
  cp -r medium_11-06-2020/PM10-idw scenarios/$1/airdata/PM10-idw
fi

if [[ ${1:0:1} == "H" ]]; then 
  cp -r heavy_24-01-2020/PM10-raw scenarios/$1/airdata/PM10-raw
  cp -r heavy_24-01-2020/PM10-idw scenarios/$1/airdata/PM10-idw
fi