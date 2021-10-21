const os = require('os')

class SystemMonitor {
    constructor() {
        setInterval(this.getSysInfo, 5000) 
    }
    getSysInfo() {
        let ver = os.version()
        let platform = os.platform()
        let release = os.release()
        let arch = os.arch()
        let freemem = os.freemem()
        let totalmem = os.totalmem()
        let uptime = os.uptime()
        let userInfo = os.userInfo()
        let homeDir = os.homedir()
        let hostname = os.hostname()
        let cpus = os.cpus()

        this.info =  {ver, platform, release, arch, freemem, totalmem, uptime, userInfo, homeDir, hostname, cpus}
        return this.info
    }


}


module.exports = SystemMonitor

