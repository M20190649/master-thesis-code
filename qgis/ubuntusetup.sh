# Add QGIS repo to sources
cat <<EOT >> /etc/apt/sources.list

deb https://qgis.org/ubuntu-ltr bionic main
deb-src https://qgis.org/ubuntu-ltr bionic main
EOT

# Add repo key
wget -O - https://qgis.org/downloads/qgis-2019.gpg.key | gpg --import
gpg --fingerprint 51F523511C7028C3
gpg --export --armor 51F523511C7028C3 | sudo apt-key add -

# Install QGIS
sudo apt-get update
sudo apt-get install qgis qgis-plugin-grass

# Install Nodejs
sudo apt-get install curl 
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install nodejs