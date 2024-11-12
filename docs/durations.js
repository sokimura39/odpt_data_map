// toggle visibility
function toggleDiv() {
    const div = document.getElementById("overlay-content");
    if (div.style.display === "none") {
        div.style.display = "block";
        document.getElementById("toggle").innerHTML = "Hide";
    } else {
        div.style.display = "none";
        document.getElementById("toggle").innerHTML = "Show";
    }
}

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [139.75, 35.69],
    zoom: 12
});

// main map
map.on('load', function(){
    Promise.all([
        fetch('data/edit/Railway.geojson').then((response) => response.json()),
        fetch('data/edit/tokyo_stations_all.geojson').then((response) => response.json()),
        fetch('data/edit/tokyo_distance.json').then((response) => response.json())
    ]).then(function ([railGeom, stationGeom, distanceDict]) {
        // add to source
        // get the features
        const railFeatures = railGeom.features;
        map.addSource('railway', {
            type: 'geojson',
            data: {
                'type': 'FeatureCollection',
                'features': railFeatures
            }                 
        });

        // starting station
        map.addSource('stationGeom', {
            type: 'geojson',
            data: stationGeom,
            generateId: true
        });

        // add layer
        map.addLayer({
            'id': 'railway',
            'type': 'line',
            'source': 'railway',
            'layout': {
                'line-sort-key': 1,
            },
            'paint': {
                'line-color': '#888888',
                'line-opacity': 0.5,
                'line-width': 2,

            }
        });
        
        // create list of stations
        const stationList = [];
        stationGeom.features.forEach((feature) => {
            if (feature.properties.station_name) {
                stationList.push(feature.properties.station_name);
            }
        });

        let startingStationName = document.getElementById('sourceStation').value;
        let startingStationNameEn = stationGeom.features.filter((feature) => feature.properties.station_name === startingStationName)[0].properties.station_name_en;

        // update starting point
        function updateStartingPoint (geomSource, startingStation) {
            startingStationName = startingStation;
            startingStationNameEn = stationGeom.features.filter((feature) => feature.properties.station_name === startingStationName)[0].properties.station_name_en;
            const source = map.getSource(geomSource);
            const features = source._data.features;
            const distance = distanceDict[startingStation];

            // move to station
            const newStation = stationGeom.features.filter((feature) => feature.properties.station_name === startingStation)[0];
            map.flyTo({center: newStation.geometry.coordinates});

            features.forEach(feature => {
                const stationName = feature.properties.station_name;
                feature.properties.distance = Math.round(Number(distance[stationName]));
            });
            source.setData(source._data);

        }
        updateStartingPoint('stationGeom', startingStationName);

        map.addLayer({
            'id': 'stationGeom',
            'type': 'circle',
            'source': 'stationGeom',
            'layout': {
                'circle-sort-key': 3,
            },
            'paint': {
                'circle-color': [
                    'case',
                    ['==', ['get', 'distance'], null], // Check if distance is null
                    '#aaaaaa', // Gray color for null distance
                    [
                        'interpolate',
                        ['linear'],
                        ['get', 'distance'],
                        0, '#fde725',
                        20, '#7ad151',
                        40, '#22a884',
                        60, '#2a788e',
                        80, '#414487',
                        100, '#440154'
                    ]
                ],
                'circle-opacity': 0.8,
                'circle-radius': [
                    'case',
                    ['==', ['get', 'distance'], null], // Check if distance is null
                    5, // Smaller circle for null distance
                    15 // Default radius
                ],

                'circle-stroke-color': '#333333',
                'circle-stroke-width': 2,
                'circle-stroke-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1, 0
                ],
            }
        });

        map.addLayer({
            'id': 'stationGeomLabel',
            'type': 'symbol',
            'source': 'stationGeom',
            'layout': {
                'text-field': '{distance}',
                'symbol-sort-key': 5
            },
            'paint': {
                'text-color': [
                    'case',
                    ['<', ['get', 'distance'], 30], // Check if distance is smaller than 10
                    '#333333', // Black color for values smaller than 10
                    '#ffffff'  // Default white color
                ],
                'text-opacity': [
                    'case',
                    ['!=', ['get', 'distance'], null],
                    1, 0
                ]
            }
        });

        // change starting station

        // eventListener
        document.getElementById('sourceStationButton').addEventListener('click', () => {
            const inputValue = document.getElementById('sourceStation').value;
            if (stationList.includes(inputValue)) {
                // update view
                updateStartingPoint('stationGeom', inputValue);
            } else {
                alert('駅名を正しく入力してください。');
            }
        });

        // popup for information
        const stationPopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom-left',
            offset: 5
        });
        map.on('mousemove', 'stationGeom', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            // reset selection
            map.removeFeatureState({
                'source': 'stationGeom'
            });
            // get selected feature
            const selectedFeature = e.features[0];
            map.setFeatureState({
                source: 'stationGeom',
                id: selectedFeature.id,
            }, {
                'hover': true
            });
            const coordinates = selectedFeature.geometry.coordinates.slice();
            const stationName = selectedFeature.properties.station_name;
            const stationNameEn = selectedFeature.properties.station_name_en;
            const distanceMins = selectedFeature.properties.distance;

            let description = "<h3>" + stationName + " / " + stationNameEn + "</h3>";
            if (distanceMins) {
                description += "<p><strong>"+ startingStationName + "</strong>からの所要時間［分］ / <br>Duration from <strong>" + startingStationNameEn + "</strong> (mins): <strong>" + distanceMins + "</strong></p><p class=\"small\">クリックで出発駅に設定<br>Click to set as source station.</p>";
            } else {
                if (stationName === startingStationName) {
                    description += "<p>出発駅 / Source station</p>"
                } else {
                    description += "<p>No Data</p>";                
                };
            };
            
            stationPopup.setLngLat(coordinates).setHTML(description).addTo(map);

        });
        map.on('mouseleave', 'stationGeom', () => {
            map.getCanvas().style.cursor = '';
            stationPopup.remove();
            map.removeFeatureState({
                'source': 'stationGeom'
            });
        });

        let lastTappedFeatureId = null;

        // Click event listener that triggers on desktop but not on touch devices
        map.on('click', 'stationGeom', (e) => {
            if (e.originalEvent.pointerType === 'mouse') {
                // Handle click for desktop
                console.log('Desktop click detected');
                
                const selectedFeature = e.features[0];
                const stationId = selectedFeature.id;
                const stationName = selectedFeature.properties.station_name;
        
                document.getElementById('sourceStation').value = stationName;
                stationPopup.remove();
                updateStartingPoint('stationGeom', stationName);
            }
        });
        
        // Touch event for detecting repeated taps on the same feature
        map.on('touchend', 'stationGeom', (e) => {
            const selectedFeature = e.features[0];
            const currentFeatureId = selectedFeature.id;
        
            // Check if the current tapped feature is the same as the last one
            if (lastTappedFeatureId === currentFeatureId) {
                // console.log('Tapped the same feature twice');
                
                // Handle double-tap-like action for touch devices
                const stationName = selectedFeature.properties.station_name;
                document.getElementById('sourceStation').value = stationName;
                updateStartingPoint('stationGeom', stationName);
                stationPopup.remove();
        
                // Optionally reset lastTappedFeatureId if you only want the action to happen once
                lastTappedFeatureId = null;
            } else {
                // Set lastTappedFeatureId to the current feature
                lastTappedFeatureId = currentFeatureId;
            }
        });
        

    });
});