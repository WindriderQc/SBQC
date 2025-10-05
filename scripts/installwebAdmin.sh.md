#!/bin/bash

# Update package list
sudo apt update

# Install required dependencies
sudo apt install -y vim apt-transport-https curl wget software-properties-common

# Download and add Webmin GPG key
wget -qO - https://download.webmin.com/jcameron-key.asc | sudo gpg --dearmor -o /usr/share/keyrings/webmin.gpg

# Add Webmin repository
echo "deb [signed-by=/usr/share/keyrings/webmin.gpg] http://download.webmin.com/download/repository sarge contrib" | sudo tee /etc/apt/sources.list.d/webmin.list

# Update package list again
sudo apt update

# Install Webmin
sudo apt install -y webmin

# Allow access through firewall (if using UFW)
sudo ufw allow 10000

echo "Webmin installation complete. Access Webmin at https://<Your-Server-IP>:10000"
