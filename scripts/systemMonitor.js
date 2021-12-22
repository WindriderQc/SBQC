const os = require('os')

class SystemMonitor {
    constructor() {
        this.updateSysInfo()
        setInterval(this.updateSysInfo, 15000) 
    }
    updateSysInfo() {
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

        let data =  {ver, platform, release, arch, freemem, totalmem, uptime, userInfo, homeDir, hostname}
        this.info = {data, cpus}
        return this.info
    }


    getinfo() {
        return this.info
    }

}


module.exports = SystemMonitor

