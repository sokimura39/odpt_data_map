
// initialise map
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [139.75, 35.69],
    zoom: 12
});

map.on('load', function(){
    
    // load data
    Promise.all([
        d3.json('data/gtfs/toei_bus/stops.geojson'),
        d3.json('data/gtfs/toei_bus/shapes_updated.geojson')
    ]).then(function([stops_data, shapes_data]){

        // add data to source
        map.addSource('shapes', {
            type: 'geojson',
            data: shapes_data
        });

        map.addSource('stops', {
            type: 'geojson',
            data: stops_data
        });

        console.log(shapes_data);

        // add layer
        map.addLayer({
            'id': 'shapes',
            'type': 'line',
            'source': 'shapes',
            'paint': {
                'line-color': '#333333',
                'line-opacity': 0.8,
                'line-width': 2
            }
        });

        map.addLayer({
            'id': 'stops',
            'type': 'circle',
            'source': 'stops',
            'paint': {
                'circle-color': 'white',
                'circle-opacity': 1,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#333333',
                'circle-radius': 3,
            }
        });

        // add popup for line
        var popup_shapes = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom-left',
            offset: 20
        });

        map.on('mouseover', 'shapes', function(e){
            map.getCanvas().style.cursor = 'pointer';
            // console.log(e.features[0].properties)

            // get info
            var route_name = e.features[0].properties.route_short_name;

            popup_shapes.setLngLat(e.lngLat).setHTML("<p>" + route_name + "</p>").addTo(map);
        });

        map.on('mouseleave', 'shapes', function(){
            map.getCanvas().style.cursor = '';
            popup_shapes.remove();
        });

        // add popup for station
        var popup_station = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            anchor: 'bottom-left',
            offset: 20
        });

        map.on('mouseover', 'stops', function(e){
            // change cursor
            map.getCanvas().style.cursor = 'pointer';

            // get data for selected station
            var coordinates = e.features[0].geometry.coordinates.slice();
            
            console.log(e.features[0].properties);
            
            var stop_name = e.features[0].properties.stop_name;
            var platform_code = e.features[0].properties.platform_code;
            var stop_id = e.features[0].properties.stop_id;

            // edit the popup
            var description = "<h3>" + stop_name + "</h3><p>ID: " + stop_id + "</p><p>platform_code: " + platform_code + "</p>";
            popup_station.setLngLat(coordinates).setHTML(description).addTo(map);
        });

        // turn popup off on mouseleave
        map.on('mouseleave', 'stops', function() {
            map.getCanvas().style.cursor = '';
            popup_station.remove();
        });


    });

});

