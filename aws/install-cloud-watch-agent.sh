wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E amazon-cloudwatch-agent.deb
sudo rm amazon-cloudwatch-agent.deb

sudo apt-get update
sudo apt-get install collectd