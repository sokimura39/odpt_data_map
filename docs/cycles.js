// define function that parses GBFS
function fetchGBFS (source, id) {
    const data = source.data.stations.filter((station) => station.station_id === id)[0];
    return data;
}

// update availability

function updateFromAPI (source_id, url) {
    fetch(url)
        .then((response) => response.json())
        .then((statusData) => {
            updateAvailability(source_id, statusData);
        })
}

function updateAvailability (source_id, status) {
    const source = map.getSource(source_id);
    const features = source._data.features;

    features.forEach(feature => {
        const station_id = feature.properties.station_id;
        const data = fetchGBFS(status, station_id);
        if (data) {
            feature.properties.availability = data.num_bikes_available;
            feature.properties.dock_availability = data.num_docks_available;
            feature.properties.calc_capacity = Number(data.num_bikes_available) + Number(data.num_docks_available);
        } else {
            feature.properties.availability = 0;
        };
    });

    source.setData(source._data);
}

// reset selections

// initialise map
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [139.75, 35.69],
    zoom: 12
});

map.on('load', function(){
    
    // load data
    Promise.all([
        d3.json('data/gbfs/station_information_d.geojson'),
        d3.json('data/gbfs/station_information_hello.geojson'),
        d3.json('https://api-public.odpt.org/api/v4/gbfs/docomo-cycle/station_status.json'),
        d3.json('https://api-public.odpt.org/api/v4/gbfs/hellocycling/station_status.json')
    ]).then(function([d_docks, h_docks, d_status, h_status]){

        // add data to source
        map.addSource('d_docks', {
            type: 'geojson',
            data: d_docks
        });
        map.addSource('h_docks', {
            type: 'geojson',
            data: h_docks
        });

        // update feature value
        // updateAvailability('d_docks', d_status);
        // updateAvailability('h_docks', h_status);
        updateFromAPI('d_docks', 'https://api-public.odpt.org/api/v4/gbfs/docomo-cycle/station_status.json');
        updateFromAPI('h_docks', 'https://api-public.odpt.org/api/v4/gbfs/hellocycling/station_status.json');
        

        // add layer to show capacity
        map.addLayer({
            'id': 'd_docks',
            'type': 'circle',
            'source': 'd_docks',
            'layout': {
                'circle-sort-key': 1,
            },
            'paint': {
                'circle-color': 'red',
                'circle-opacity': 0.2,
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'calc_capacity'],
                    0,0,
                    500,200
                ],
            }
        });
        map.addLayer({
            'id': 'h_docks',
            'type': 'circle',
            'source': 'h_docks',
            'layout': {
                'circle-sort-key': 1,
            },
            'paint': {
                'circle-color': 'yellow',
                'circle-opacity': 0.2,
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'calc_capacity'],
                    0,0,
                    500,200
                ],
            }
        });

        // add layer to show availability
        map.addLayer({
            'id': 'd_docks_availability',
            'type': 'circle',
            'source': 'd_docks',
            'layout': {
                'circle-sort-key': 3,
            },
            'paint': {
                'circle-color': 'red',
                'circle-opacity': 0.6,
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'availability'],
                    0,0,
                    500,200
                ],
            }
        });
        map.addLayer({
            'id': 'h_docks_availability',
            'type': 'circle',
            'source': 'h_docks',
            'layout': {
                'circle-sort-key': 1,
            },
            'paint': {
                'circle-color': 'yellow',
                'circle-opacity': 0.6,
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'availability'],
                    0,0,
                    500,200
                ],
            }
        });

        // add popup for station
        var d_popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom-left',
            offset: 20
        });

        map.on('mousemove', 'd_docks_availability', function(e){
            // change cursor
            map.getCanvas().style.cursor = 'pointer';

            // get data for selected station
            let selectedFeature = e.features[0];

            const coordinates = selectedFeature.geometry.coordinates.slice();
            
            const station_id = selectedFeature.properties.station_id;
            const station_name = selectedFeature.properties.name;
            const station_capacity = selectedFeature.properties.calc_capacity;

            // const station_status = fetchGBFS(d_status, station_id);
            // console.log(station_status);
            // const availability = station_status.num_bikes_available;
            const availability = selectedFeature.properties.availability;
            const dock_availability = selectedFeature.properties.dock_availability;

            // edit the popup
            var description = "<h3>" + station_name + "</h3><table><tr><td>Operator</td><td>" + "d Bike Share" + "</td></tr><tr><td>Station ID</td><td>" + station_id + "</td></tr><tr><td>Docks Available</td><td>" + dock_availability + "</td></tr><tr><td>Bikes Available</td><td>" + availability + "</td></tr></table>";
            d_popup.setLngLat(coordinates).setHTML(description).addTo(map);
        });

        // turn popup off on mouseleave
        map.on('mouseleave', 'd_docks_availability', function() {
            map.getCanvas().style.cursor = '';
            d_popup.remove();
        });
        map.on('mousemove', 'h_docks_availability', function(e){
            // change cursor
            map.getCanvas().style.cursor = 'pointer';

            // get data for selected station
            const coordinates = e.features[0].geometry.coordinates.slice();
            
            const station_id = e.features[0].properties.station_id;
            const station_name = e.features[0].properties.name;
            const station_capacity = e.features[0].properties.calc_capacity;

            // const station_status = fetchGBFS(d_status, station_id);
            // console.log(station_status);
            // const availability = station_status.num_bikes_available;
            const availability = e.features[0].properties.availability;
            const dock_availability = e.features[0].properties.dock_availability;

            // edit the popup
            var description = "<h3>" + station_name + "</h3><table><tr><td>Operator</td><td>" + "HelloCycling" + "</td></tr><tr><td>Station ID</td><td>" + station_id + "</td></tr><tr><td>Docks Available</td><td>" + dock_availability + "</td></tr><tr><td>Bikes Available</td><td>" + availability + "</td></tr></table>";
            d_popup.setLngLat(coordinates).setHTML(description).addTo(map);
        });

        // turn popup off on mouseleave
        map.on('mouseleave', 'h_docks_availability', function() {
            map.getCanvas().style.cursor = '';
            d_popup.remove();
        });
    });

});
