
#sudo apt install -y openssh-server
sudo curl -fsSL https://deb.nodesource.com/setup_current.x|sudo -E bash -
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs
sudo apt install -y nginx
sudo apt install -y mosquitto
sudo mosquitto -d



sudo npm install pm2@latest -g
sudo pm2 startup systemd

sudo apt install git -y

mkdir sbqc
cd sbqc
git clone https://github.com/WindriderQc/SBQC.git
cd SBQC
npm install
npm start