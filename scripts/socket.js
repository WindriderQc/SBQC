const socket = require('socket.io')
const assert = require('assert')

let io_
const connectedSockets = new Map();

function init(server)
{
    if (io_) {   console.warn("Already initialized and Trying to init Socket.io again!");  return io_     }
    
    console.log('Launching socket server...')
    const io  = socket(server, { cors: { origin: '*' } })
       


    io.on('connection', (socket) => {
        
        console.log('New SocketIO Connection: ', socket.id )
       
        connectedSockets.set(socket.id, socket);

        socket.on('chat message', (msg) => {
            io.sockets.emit('chat message', msg);  // Sending to every client
        });
    
        socket.on('mouse', (data) => {
            // io.sockets.emit()  will emit back to sender as well.  could be used if data is modified by server
            socket.broadcast.emit('mouse', data); // This will send to all clients except the source
        });

            
        socket.on('disconnect', () => {
            console.log('user disconnected: ', socket.id);
            connectedSockets.delete(socket.id);
        });

        socket.on('mqtt-command', (data) => {
            const { topic, message } = data;
            if (topic && message) {
                console.log(`Received mqtt-command to publish to ${topic}`);
                const mqttClient = require('./mqttServer').getClient();
                if (mqttClient) {
                    mqttClient.publish(topic, message);
                }
            }
        });
    })

  

    io_ = io
    return io_ 
}


function get_io() { assert.ok(io_, "IO has not been initialized. Please called init first.");   return io_  }

function get_sockets() { return connectedSockets; }

module.exports = {
  get_io,
  get_sockets, // Renamed from get_socket
  init
};

