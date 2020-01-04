zcat ../matsim/berlin-v5-network.xml.gz > berlin-v5-network.xml
netconvert --matsim berlin-v5-network.xml -o ./matsim-network.net.xml --matsim.lanes-from-capacity=true
rm -rf berlin-v5-network.xml
