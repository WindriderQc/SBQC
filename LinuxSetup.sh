sudo apt update && sudo apt upgrade -y

#Install SSH
sudo apt install openssh-server -y
#  this insure service start at boot  (usually not necessary, done default at install.)
sudo systemctl enable ssh   
sudo systemctl start ssh


# Install node.js
curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
sudo apt install -y nodejs
node -v


# Install PM2
sudo npm install pm2@latest -g
pm2 startup systemd

# required for platformIO (VS Code) to install properly
sudo apt install python3-venv -y

# Install VS Code   
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /usr/share/keyrings/
sudo sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'

sudo apt install apt-transport-https
sudo apt update
sudo apt install code 
# or code-insiders

sudo apt install git -y




sudo apt autoremove --purge libreoffice* thunderbird  -y


#######     USER NAME REQUIRED HERE   et dépends de ou le script est roulé   bad..  ###########     !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  <---    <---
rm /home/yb/Desktop/packages.microsoft.gpg


#Improve Application Startup Speed With Preload in Ubuntu  
sudo apt install preload

