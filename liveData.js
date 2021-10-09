const fetch = require('node-fetch')
const nodeTools = require('./nodeTools')
//nodeTools.readFile("greetings.txt")

let datas = {version: "1.0"}




const api_url = 'https://api.wheretheiss.at/v1/satellites/25544';

async function getISS() 
{
    const response = await fetch(api_url)
    const data = await response.json()
    const { latitude, longitude } = data
    datas.iss = { latitude, longitude }
   //console.log(liveData.iss)
 
    return datas.iss
}
getISS()
setInterval(getISS, 10000)






const CSVToJSON = require('csvtojson');
const quakes_url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv'

async function getQuakes() 
{
    try {
        const response = await fetch(quakes_url)
        const data = await response.text()

        nodeTools.saveFile( data,"./public/data/quakes.csv",)




        const quakes = await CSVToJSON().fromString(data);
        datas.quakes = quakes
        // log the JSON array
        // console.log(quakes);
        return datas.quakes
    } catch (err) {
        console.log(err);
    }

}
//getQuakes()
setInterval(getQuakes, 24*60*60*1000)  // daily








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

