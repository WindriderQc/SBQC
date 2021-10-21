const EventEmitter = require('events')
const uuid = require('uuid')
const fs = require('fs');

console.log(uuid.v4())

 class Logger extends EventEmitter {
     log(msg) {
        //Call event
        const uIDmsg=  { id: uuid.v4(), msg: msg}
        this.emit('message', uIDmsg);
        

        // logging the event to a file
        let msgString = JSON.stringify(uIDmsg) + "\n"
        fs.writeFile('log.txt', msgString,  { flag: "a+" }, (err) => {  // Use a+ flag to append and create a file (if doesn't exist)
                        if (err) throw err;
                    });  
     }
 }

 module.exports = Logger