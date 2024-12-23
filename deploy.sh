
#sudo apt install -y openssh-server
sudo curl -fsSL https://deb.nodesource.com/setup_current.x|sudo -E bash -
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs
node -v
sudo apt install -y nginx
sudo apt install -y mosquitto
sudo mosquitto -d
##   TODO: je crois qu'il manque des config mosquitto   genre user et password...  ou au moin mettre Persistance=false et anonynous=true dans mosquitto.conf


sudo npm install pm2@latest -g
sudo pm2 startup systemd

sudo apt install git -y

#git clone https://github.com/WindriderQc/SBQC.git
#cd SBQC
npm install

#npm start

pm2 start sbqc_serv.js
pm2 save
