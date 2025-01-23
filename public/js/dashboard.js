// Requires tools.js and chartjs-chart-geo libraries
let worldMap;

document.addEventListener('DOMContentLoaded', async function() {

    const hoverElement = document.getElementById('hoverElement');

    hoverElement.addEventListener('mouseenter', function() {
      hoverElement.classList.add('animate-fading');
    });

    hoverElement.addEventListener('mouseleave', function() {
      hoverElement.classList.add('animate-opacity');
    });

    const sourceSelect = document.getElementById('sourceSelect');
      sourceSelect.addEventListener('change', function() {
        source = this.value;
        skip = 0; 
        listAllLogs(source); 
      });
    
    
    listAllLogs("userLogs");

    await getUserInfo()


});


  
async function getUserInfo()
{
    const info = await Tools.ipLookUp()
    document.getElementById('ip_id').innerHTML =  "<pre>"+JSON.stringify(info.TimeZone,null, '\t') +"</pre>"
} 


function setWorlGraph(data) {
    
      // Mapping of incorrect country names to correct country names
      const countryNameCorrections = {
        "United States" : "United States of America",
        "Russia": "Russian Federation",
        "South Korea": "Korea, Republic of",
        // Add more mappings as needed
    };

    const countryCounts = data.reduce((acc, entry) => {
        // Correct the country name if it exists in the mapping
        const correctedCountryName = countryNameCorrections[entry.CountryName] || entry.CountryName;
        acc[correctedCountryName] = (acc[correctedCountryName] || 0) + 1;
        return acc;
    }, {});
    //console.log('worldMapData', countryCounts);

 


    // Fetch or define the geo data (e.g., world geoJSON) 
    fetch('https://unpkg.com/world-atlas/countries-50m.json')
        .then(response => response.json())
        .then(world => {
        
            const countries = ChartGeo.topojson.feature(world, world.objects.countries).features;
            //console.log('countries', countries);

            // Create a set of valid country names
            const validCountryNames = new Set(countries.map(country => country.properties.name));
            // Check for missing country names
            Object.keys(countryCounts).forEach(countryName => {
                
                if (!validCountryNames.has(countryName)) {
                        console.warn(`Country name not found in ChartGeo countries list: ${countryName}`);
                    }
            });

            // Prepare the dataset
            const chartData = {
                labels: countries.map(d => d.properties.name),
                datasets: [{
                    label: 'Countries',
                  data: countries.map(country => ({
                        feature: country,
                        value: countryCounts[country.properties.name] || 0
                    })),
                    outline: countries,
                    backgroundColor: (context) => {
                        const dataItem = context.dataset.data[context.dataIndex];
                        const value = dataItem.value;

                        if (!dataItem || !value) {
                            return 'rgba(200, 200, 200, 0.25)'; // Default color for undefined values
                        }
                       
                        if (value < 40) {
                             return `rgba(0, 200, 100, ${(value*5)/200   + 0.15 })`;
                        }
                        return `rgba(0, 100, 200, ${(value*3)/100  + 0.1 })`;
                    },
                }]
            };
            const config = {
                type: 'choropleth',
                data: chartData,
                options: {
                    showOutline: false,
                    showGraticule: false,
                    scales: {
                        projection: {
                            axis: 'x',
                            projection: 'equalEarth',
                        },
                    },
                    onClick: (evt, elems) => {
                        console.log(elems.map((elem) => elem.element.feature.properties.name));
                    },
                    geo: {
                        colorScale: {
                            display: false,
                        }
                    }, 
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            };
            //worldMap = new Chart( document.getElementById('worldMap'), config);
            if (worldMap) {
                    worldMap.destroy();
                }
                worldMap = new Chart(document.getElementById('worldMap'), config);

        });       
}

const loadingElement = document.querySelector('.loading');
const logsElement = document.querySelector('.logs');


let skip = 0;
let sort = 'desc'; 
let loading = false;


function listAllLogs(source) {
  loading = true;
  loadingElement.style.display = '';
    const url = `/v2/logs?skip=${skip}&sort=${sort}&source=${source}`
  const options =  { method: 'GET',    mode: 'no-cors' }

  fetch(url, options)
    .then(response => response.json())
    .then(result => {

        if (!result.logs || result.logs.length === 0) {
                console.warn('No logs available to display.');
                loadingElement.style.display = 'none';
                return;
            }

        //console.log('result', result)
        setWorlGraph(result.logs)



        // Dynamically generate DataTable columns
        const columns = Object.keys(result.logs[0]).map((key) => ({
                title: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize column names
                data: key,
                render:
                    key === 'date' || key === 'created'
                        ? function (data) {
                              const date = new Date(data); // Convert to Date object
                              return date.toLocaleString(); // Format the date
                          }
                        : null,
            }));

   
        loadDataTable({ data: result.logs,  columns });
        
        loadingElement.style.display = 'none';
    })
    .catch(error => {
        console.error('Error fetching logs:', error);
        loadingElement.style.display = 'none';
    });
   
}

function loadDataTable(dataset) {
    console.log('dataset', dataset);

    // Clear the table and remove lingering DataTable instance
    const table = $('#logsTable');
    if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().clear().destroy(); // Fully destroy the instance
    }

    // Empty the table structure to remove old columns
    table.empty();

    // Reinitialize the DataTable with the new dataset and columns
    table.DataTable({
        data: dataset.data,
        columns: dataset.columns,
        destroy: true, // Ensure old table is destroyed (redundant here for safety)
        scrollX: true
    });
}


var mySidebar = document.getElementById("mySidebar");
var overlayBg = document.getElementById("myOverlay");
// Toggle and add overlay effect
function w3_open() {
  if (mySidebar.style.display === 'block') {
    mySidebar.style.display = 'none';
    overlayBg.style.display = "none";
  } else {
    mySidebar.style.display = 'block';
    overlayBg.style.display = "block";
  }
}
// Close the sidebar with the close button
function w3_close() {
  mySidebar.style.display = "none";
  overlayBg.style.display = "none";
}