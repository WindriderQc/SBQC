// depends on moment.js and Chart.js

let luxChart
let luxData = { tstamp: [], ir: [], full: [], visible: [], lux: [] }


function graphRemoveLast(chart, update = false)
{
    chart.data.datasets.forEach((dataset) => {
        dataset.data.shift(); // remove the first left value
    });     
    
    chart.data.labels.shift();

    if(update) chart.update()
}




function resetLuxChart() 
{


    luxData.tstamp.splice(0, luxData.tstamp.length)
    luxData.ir.splice(0, luxData.ir.length)
    luxData.full.splice(0, luxData.full.length)
    luxData.visible.splice(0, luxData.visible.length)
    luxData.lux.splice(0, luxData.lux.length)

    luxChart.destroy()
}


async function createLuxChart(data, height) 
{
    if(luxChart) resetLuxChart()

    /*var Labels = data.map(function(d) {return d.time});
    var grafData = data.map(function(d) {return d.Weeks;});*/


    for (item of data) {  //  TODO: fix newData() pour l'utiliser ici
        luxData.tstamp.push(moment(item.time).format('MM-DD    HH:mm'))

        luxData.ir.push(item.ir)
        luxData.full.push(item.full)
        luxData.visible.push(item.visible)
        luxData.lux.push(item.lux)
    }


    const luxCanvas = document.getElementById('luxChart').getContext('2d');
             
    var gradientGray = luxCanvas.createLinearGradient(0, 0, 0, 250);
    gradientGray.addColorStop(0, 'rgba(25,25,25,0.9)');   
    gradientGray.addColorStop(1, 'rgba(25,25,25,0.1)');

    var gradientBlue = luxCanvas.createLinearGradient(0, 0, 0, 100);
    gradientBlue.addColorStop(0, 'rgba(25,25,255,0.9)');   
    gradientBlue.addColorStop(1, 'rgba(25,25,255,0.1)');
    

    luxChart = new Chart(luxCanvas, {
        type: 'line',
        data: {
            labels: luxData.tstamp,
            datasets: [
                {
                label: 'IR',   // 0
                data:  luxData.ir,
                spanGaps: false,
                showLines: true,
                fill: false,
                radius: 0.1,
                backgroundColor: 'rgba(220, 10, 10, 0.5)', 
                borderColor: 'rgba(220, 10, 10, 1)',
                borderWidth: 1,
                yAxisID: "yaxis",
                },
                {
                label: 'Full',  // 2
                data:  luxData.full,
                spanGaps: false,
                showLines: true,
                radius: 0,
                type: 'line',
                fill: true,
                backgroundColor: gradientBlue, 
                borderColor: 'rgba(25,25,255,0.1)',
                borderWidth: 2,
                yAxisID: "yaxis"
                } ,
                {
                label: 'Visible',   // 3
                data:  luxData.visible,
                spanGaps: false,
                showLines: true,
                radius: 0,
                type: 'line',
                fill: false,
                backgroundColor: 'rgba(5,5,5,0.9)',
                borderColor: 'rgba(5,5,5,0.9)',
                borderWidth: 2,
                yAxisID: "yaxis"
                } ,
                {
                label: 'Lux',   // 3
                data:  luxData.lux,
                spanGaps: false,
                showLines: true,
                radius: 0,
                type: 'line',
                fill: true,
                backgroundColor: gradientGray,
                borderColor: 'rgba(25,25,25,0.1)',
                borderWidth: 2,
                yAxisID: "yaxislux"
                } 

            ]
        },
        options: {  
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                yaxis: {
                     ticks: {
                            beginAtZero: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'value'
                        }
                },
                yaxislux: {
                        position: 'right',
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: 20
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Lux'
                        }
                }                                            
            }
        }
    })

    const d =  document.getElementById('luxChart')
    d.height = height

}


function newLuxData(dat) 
{
    //console.log(dat)
    if(luxChart) {

        if(luxChart.data.datasets[0].data.length > 20) {
            graphRemoveLast(luxChart)
        }
            
        luxChart.data.labels.push(moment(dat.time).format('MM-DD    HH:mm'))

        luxChart.data.datasets[0].data.push(dat.ir)  
        luxChart.data.datasets[1].data.push(dat.full)
        luxChart.data.datasets[2].data.push(dat.visible)  
        luxChart.data.datasets[3].data.push(dat.lux)  
    
        luxChart.update()  

    }    
}
