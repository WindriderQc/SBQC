const socket = require('socket.io')
const assert = require('assert')
const ioClient = require('socket.io-client');

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

    })

  

    io_ = io
    return io_ 
}


function get_io() { assert.ok(io_, "IO has not been initialized. Please called init first.");   return io_  }

function get_sockets() { return connectedSockets; }

// --- DataAPI Client Logic ---
const DATA_API_SOCKET_URL = 'http://data.specialblend.ca';
const dataApiClient = ioClient(DATA_API_SOCKET_URL);

dataApiClient.on('connect', () => {
    console.log('Successfully connected to DataAPI socket server at', DATA_API_SOCKET_URL);
});

dataApiClient.on('disconnect', (reason) => {
    console.log('Disconnected from DataAPI socket server:', reason);
});

dataApiClient.on('connect_error', (error) => {
    console.error('Error connecting to DataAPI socket server:', error);
});

// Listen for 'iss' events from DataAPI
dataApiClient.on('iss', (issData) => {
    console.log('Received ISS data from DataAPI:', issData);
    try {
        const mainServerIo = get_io(); // Get our own server's IO instance
        if (mainServerIo) {
            mainServerIo.sockets.emit('iss', issData); // Broadcast to our clients
            console.log('Relayed ISS data to local clients.');
        } else {
            console.warn('Main server IO not available to relay ISS data (may not be initialized yet).');
        }
    } catch (error) {
        // This catch block will handle errors from get_io() if io_ is not initialized
        console.warn('Error relaying ISS data, main server IO likely not initialized yet:', error.message);
    }
});
// --- End DataAPI Client Logic ---

module.exports = {
  get_io,
  get_sockets, // Renamed from get_socket
  init
};

