// depends on moment.js and Chart.js

let gazChart
let gazData = { tstamp: [],  lpg: [], co: [], smoke: [] }


function graphRemoveLast(chart, update = false)
{
    chart.data.datasets.forEach((d) => {  d.data.shift() });   // remove the first left value
    
    chart.data.labels.shift()

    if(update) chart.update()
}

function resetGazChart() 
{

    gazData.tstamp.splice(0, gazData.tstamp.length)
    gazData.lpg.splice(0, gazData.lpg.length)
    gazData.co.splice(0, gazData.co.length)
    gazData.smoke.splice(0, gazData.smoke.length)

    gazChart.destroy()
   
}

async function createGazChart(data, height) 
{

    if(gazChart) resetGazChart()


    for (item of data) {  //  TODO: fix newData() pour l'utiliser ici
        gazData.tstamp.push(moment(item.time).format('MM-DD    HH:mm'))

        gazData.lpg.push(item.lpg)
        gazData.co.push(item.co2)
        gazData.smoke.push(item.smoke)
    }


    const gazCanvas = document.getElementById('gazChart').getContext('2d');
             
    let gradientGray = gazCanvas.createLinearGradient(0, 0, 0, 250);
    gradientGray.addColorStop(0, 'rgba(25,25,25,0.9)');   
    gradientGray.addColorStop(1, 'rgba(25,25,25,0.1)');


    const d =  document.getElementById('gazChart')
    d.height = height

    gazChart = new Chart(gazCanvas, {
        type: 'line',
        data: {
            labels: gazData.tstamp,
            datasets: [
                {
                label: 'LPG',   // 0
                data:  gazData.lpg,
                spanGaps: false,
                showLines: true,
                fill: false,
                radius: 0.1,
                backgroundColor: 'rgba(220, 10, 10, 0.5)', 
                borderColor: 'rgba(220, 10, 10, 1)',
                borderWidth: 1,
                yAxisID: "yaxisppm",
                },
                {
                label: 'Co2',  // 2
                data:  gazData.co,
                spanGaps: false,
                showLines: true,
                radius: 0,
                type: 'line',
                fill: false,
                backgroundColor: 'rgba(225, 125, 10, 0.5)', 
                borderColor: 'rgba(225, 125, 10, 1)',
                borderWidth: 1,
                yAxisID: "yaxisppm"
                } ,
                {
                label: 'smoke',   // 3
                data:  gazData.smoke,
                spanGaps: false,
                showLines: true,
                radius: 0,
                type: 'line',
                fill: true,
                backgroundColor: gradientGray,
                borderColor: 'rgba(25,25,25,0.1)',
                borderWidth: 2,
                yAxisID: "yaxisppm"
                } 

            ]
        },
        options: {  
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                yaxisppm: {
                    ticks: {
                        suggestedMax: 200,
                        beginAtZero: true
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'ppm'
                    }
                }                               
            }
        }
    })

}


function newGazData(dat) 
{
    //console.log(dat)
    if(gazChart) {

        if(gazChart.data.datasets[0].data.length > 20) {
            graphRemoveLast(gazChart)
        }
            
        gazChart.data.labels.push(moment(dat.time).format('MM-DD    HH:mm')) //formatTime(dat.time))

       // gazChart.data.datasets[0].data.push(dat.lpg)  
       // gazChart.data.datasets[1].data.push(dat.co2)
       // gazChart.data.datasets[2].data.push(dat.smoke)  

        gazData.lpg.push(dat.lpg)
        gazData.co.push(dat.co2)
        gazData.smoke.push(dat.smoke)
    
        gazChart.update()  

    }    
}