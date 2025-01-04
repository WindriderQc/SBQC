//const fetch = require('node-fetch')

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const nodeTools = require('./nodeTools') //nodeTools.readFile("greetings.txt")
const socketio = require('./socket')





let datas = { version: 1.0 }


async function getISS() 
{
    const iss_api_url = 'https://api.wheretheiss.at/v1/satellites/25544';

    try {
        const response = await fetch(iss_api_url)
        const data = await response.json()
        const { latitude, longitude } = data
        datas.iss = { latitude, longitude }

        let io = socketio.get_io()
        io.sockets.emit('iss', datas.iss)
    } 
    catch (error) {
        console.log(error)
        console.log('Better luck next time...  Keep Rolling! ')
        datas.iss = {latitude:0,longitude:0}
    } 

    return datas.iss
}


const CSVToJSON = require('csvtojson');
const quakes_url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv'
const quakesPath = "./public/data/quakes.csv";

async function getQuakes() 
{
    try {
        const response = await fetch(quakes_url)
        const data = await response.text()

        nodeTools.saveFile( data, quakesPath)
        datas.quakes = await CSVToJSON().fromString(data);  // converts to JSON array
    } catch (err) {
        console.log(err);
        datas.quakes = {}
    }

    return datas.quakes

}





async function getZonAnn() {
    try {
        const response = await fetch('https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv');
        const data = await response.text();

        const table = data.split('\n').slice(1);   //  slice delete line 1
        
        table.forEach(row => {
            const columns = row.split(',');
            const year = columns[0];
            const temp = columns[1];
        
            //console.log(year, temp)
            datas.yearTemp = {year, temp};
            return datas.yearTemp;  //  TODO:  mais...    ca va retourner juste la premiere ligne du tableau!?
        });
    } catch (err) {
        console.log('Failed to fetch ZonAnn data:', err);
        datas.yearTemp = {};
    }
}




function init()
{
    console.log('about to fetch ZoneAnn')
    getZonAnn() 

    if (!nodeTools.isExisting(quakesPath)) {
        console.log("No Earthquakes datas, requesting data to API now and will actualize daily.", path);
        getQuakes()
    }

    getISS()
}


async function issLocation()   //  TODO:  pkoi ces function...?  pkoi ne pas exporter getISS et getQuakes?
{
    const data = await getISS()
    return data
}

async function quakes()
{
    const data = await getQuakes()
    return data
}



// const intervals = { quakes:1000*60*60*24*7, iss: 1000*5 }
function setAutoUpdate(intervals, updateNow) 
{
    if(updateNow) {
        getQuakes()
        getISS()
    }

    setInterval(getQuakes,intervals.quakes) // 24*60*60*1000)  // daily
    setInterval(getISS, intervals.iss) //10*1000)             // every 10sec
}


module.exports = {
    init,
    setAutoUpdate,
    datas,
    issLocation, 
    quakes
  };

  

