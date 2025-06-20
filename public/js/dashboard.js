(function() {
    // Requires tools.js and chartjs-chart-geo libraries
    let worldMap;
    let source; // Define source in a scope accessible by the change listener and listAllLogs

    document.addEventListener('DOMContentLoaded', async function() {

        const hoverElement = document.getElementById('hoverElement');
        if (hoverElement) { // Check if element exists
            hoverElement.addEventListener('mouseenter', function() {
              hoverElement.classList.add('animate-fading');
            });

            hoverElement.addEventListener('mouseleave', function() {
              hoverElement.classList.add('animate-opacity');
            });
        }

        const sourceSelect = document.getElementById('sourceSelect');
        if (sourceSelect) { // Check if element exists
            sourceSelect.addEventListener('change', function() {
                source = this.value;
                skip = 0;
                listAllLogs(source);
            });
        }

        listAllLogs("userLogs"); // Initial load

        await getUserInfo();
        await populateFeedsTable();

    });


    async function getUserInfo() {
        try {
            const info = await Tools.ipLookUp();
            const ipElement = document.getElementById('ip_id');
            if (ipElement) { // Check if element exists
                 ipElement.innerHTML =  "<pre>"+JSON.stringify(info.TimeZone,null, '\t') +"</pre>";
            }
        } catch (error) {
            console.error("Error fetching user info:", error);
        }
    }

    async function populateFeedsTable() {
        try {
            const response = await fetch('/api/feeds');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const feeds = await response.json();

            const tbody = document.getElementById('feeds-table-body');
            if (!tbody) {
                // console.error('Feeds table body not found!'); // Kept for critical failure
                return;
            }

            tbody.innerHTML = ''; // Clear existing rows

            feeds.forEach(feedItem => {
                const row = tbody.insertRow();

                const iconCell = row.insertCell();
                const iconEl = document.createElement('i');
                iconEl.className = feedItem.icon;
                iconCell.appendChild(iconEl);

                const descriptionCell = row.insertCell();
                descriptionCell.textContent = feedItem.description;

                const timeCell = row.insertCell();
                const timeItalic = document.createElement('i');
                timeItalic.textContent = feedItem.time;
                timeCell.appendChild(timeItalic);
            });

        } catch (error) {
            console.error('Error populating feeds table:', error); // Keep for error feedback
            const tbody = document.getElementById('feeds-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Could not load feeds.</td></tr>';
            }
        }
    }


    function setWorlGraph(data) {
        const countryNameCorrections = {
            "United States" : "United States of America",
            "Russia": "Russian Federation",
            "South Korea": "Korea, Republic of",
        };

        const countryCounts = data.reduce((acc, entry) => {
            const correctedCountryName = countryNameCorrections[entry.CountryName] || entry.CountryName;
            acc[correctedCountryName] = (acc[correctedCountryName] || 0) + 1;
            return acc;
        }, {});

        // External dependency: Fetches geographical data for the world map.
        // Consider hosting this locally if possible and license permits.
        fetch('https://unpkg.com/world-atlas/countries-50m.json')
            .then(response => response.json())
            .then(world => {
                const countries = ChartGeo.topojson.feature(world, world.objects.countries).features;
                const validCountryNames = new Set(countries.map(country => country.properties.name));
                
                Object.keys(countryCounts).forEach(countryName => {
                    if (!validCountryNames.has(countryName)) {
                        // console.warn(`Country name not found in ChartGeo countries list: ${countryName}`); // Removed warning
                    }
                });

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
                            const dataItem = context.dataset.data[context.index];
                            if (!dataItem || !dataItem.value) {
                                return 'rgba(200, 200, 200, 0.25)';
                            }
                            const value = dataItem.value;
                            if (value < 40) return `rgba(0, 200, 100, ${(value * 5) / 200 + 0.15})`;
                            return `rgba(0, 100, 200, ${(value * 3) / 100 + 0.1})`;
                        },
                    }]
                };

                const config = {
                    type: 'choropleth',
                    data: chartData, // chartData is now part of config
                    options: {
                        showOutline: false,
                        showGraticule: false,
                        scales: {
                            projection: {
                                axis: 'x',
                                projection: 'equalEarth',
                            },
                        },
                        // onClick: (evt, elems) => { // Removed debug onClick
                        //     // console.log(elems.map((elem) => elem.element.feature.properties.name));
                        // },
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

                const canvas = document.getElementById('worldMap');
                if (!canvas) return; // Ensure canvas exists

                if (worldMap && worldMap.destroy) { // Check if worldMap exists and has destroy method
                    worldMap.data = chartData;
                    // worldMap.options = config.options; // Only if options change dynamically too
                    worldMap.update();
                } else {
                    if (worldMap && worldMap.destroy) worldMap.destroy(); // Defensive: destroy if it exists but isn't a valid chart instance we want to update
                    worldMap = new Chart(canvas, config);
                }
            })
            .catch(error => console.error('Error fetching or processing world map data:', error)); // Keep for error feedback
    }

    const loadingElement = document.querySelector('.loading');
    // const logsElement = document.querySelector('.logs'); // logsElement is not used

    let skip = 0;
    let sort = 'desc';
    // let loading = false; // loading variable is not used

    function listAllLogs(currentSource) { // Renamed parameter to avoid conflict with global 'source'
      // loading = true; // loading variable is not used
      if (loadingElement) loadingElement.style.display = ''; // Check if element exists

      const url = `/v2/logs?skip=${skip}&sort=${sort}&source=${currentSource}`; // Use currentSource
      const options =  { method: 'GET', mode: 'no-cors' }; // mode: 'no-cors' might be problematic for JSON APIs

      fetch(url, options)
        .then(response => {
            if (!response.ok && response.type !== 'opaque') { // Opaque responses (due to no-cors) don't have readable status
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            if (!result.logs || result.logs.length === 0) {
                // console.warn('No logs available to display.'); // Removed warning
                if (loadingElement) loadingElement.style.display = 'none';
                // Optionally clear the table or show a "no data" message in it
                const table = $('#logsTable');
                if ($.fn.DataTable.isDataTable(table)) {
                    table.DataTable().clear().draw(); // Clear table if no logs
                }
                return;
            }
            setWorlGraph(result.logs);

            const columns = Object.keys(result.logs[0]).map((key) => ({
                title: key.charAt(0).toUpperCase() + key.slice(1),
                data: key,
                render:
                    key === 'date' || key === 'created'
                        ? function (data) {
                              const date = new Date(data);
                              return date.toLocaleString();
                          }
                        : null,
            }));
   
            loadDataTable({ data: result.logs,  columns });

            if (loadingElement) loadingElement.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching logs:', error); // Keep for error feedback
            if (loadingElement) loadingElement.style.display = 'none';
             const table = $('#logsTable');
            if (table.length > 0) { // Check if table element exists
                 table.html('<tr><td colspan="'+ (table.find('thead th').length || 1) +'" class="text-center text-danger">Could not load logs.</td></tr>');
            }
        });
    }

    function loadDataTable(dataset) {
        // console.log('dataset', dataset); // Removed debug log
        const table = $('#logsTable');
        if (!table.length) return; // Ensure table element exists

        if ($.fn.DataTable.isDataTable(table)) {
            table.DataTable().clear().destroy();
        }
        table.empty(); // Clear previous structure (headers specifically if columns change)

        table.DataTable({
            data: dataset.data,
            columns: dataset.columns,
            destroy: true,
            scrollX: true
        });
    }

    // Keep w3_open and w3_close global if they are used by inline onclick handlers in EJS partials
    // If they can be localized (e.g., by adding event listeners here to elements in miniNav.ejs),
    // then these do not need to be on the window object.
    var mySidebar = document.getElementById("mySidebar");
    var overlayBg = document.getElementById("myOverlay");

    window.w3_open = function() {
      if (mySidebar && overlayBg) { // Check if elements exist
        if (mySidebar.style.display === 'block') {
            mySidebar.style.display = 'none';
            overlayBg.style.display = "none";
        } else {
            mySidebar.style.display = 'block';
            overlayBg.style.display = "block";
        }
      }
    }

    window.w3_close = function() {
      if (mySidebar && overlayBg) { // Check if elements exist
        mySidebar.style.display = "none";
        overlayBg.style.display = "none";
      }
    }

})();