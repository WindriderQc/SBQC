
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -

echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt upgrade -y
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

systemctl enable mongod.service    #  insure launch at startup



#Mongo authentication

in /etc/mongod.conf    change bindip to 0.0.0.0 instead of 127.0.0.1
uncomment security and use:
security: 
authorization: enabled

on terminal  type  mongo

use admin
db.createUser(
    {
        user: "superuser",
        pwd: "changeMeAsStrongPassword",
        roles:  [ "root" ]
    }
  )

  restart db. *** bug*** use  admin; db.auth(USER_NAME, PASS_WORD)






*** bug ***
  Just do those two commands for temporary solution:

sudo rm -rf /tmp/mongodb-27017.sock
sudo service mongod start
For details:

That shall be fault due to user permissions in .sock file, You may have to change the owner to monogdb user.

sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock




hostnamectl      donne info cool et bref