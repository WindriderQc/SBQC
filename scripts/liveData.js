const fetch = require('node-fetch')
const nodeTools = require('./nodeTools') //nodeTools.readFile("greetings.txt")

let datas = {version: "1.0"}


const iss_api_url = 'https://api.wheretheiss.at/v1/satellites/25544';

async function getISS() 
{
    
    try {
        const response = await fetch(iss_api_url)
        const data = await response.json()
        const { latitude, longitude } = data
        datas.iss = { latitude, longitude }
    } catch (error) {
        console.log(error)
        datas.iss = {latitude:0,longitude:0}
    } 

    return datas.iss
}
getISS()







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

if (!nodeTools.isExisting(quakesPath)) {
    console.log("No Earthquakes datas, requesting data to API now and will actualize daily.", path);
    getQuakes()
}







exports.data = datas

exports.issLocation = async () => 
{
    const data = await getISS()
    return data
}

exports.quakes = async () => 
{
    const data = await getQuakes()
    return data
}

exports.setAutoUpdate = (intervals) => 
{
    setInterval(getQuakes,intervals.quakes) // 24*60*60*1000)  // daily
    setInterval(getISS, intervals.iss) //10*1000)             // every 10sec
}