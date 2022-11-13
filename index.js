const { createApp } = Vue


// const event = new Event('onCameraParameters');
const featureId = null;

// create map view 
const draw = new MapboxDraw({
  controls: {
    combine_features: false,
    point: false,
    line_string: false,
    uncombine_features: false
  }
});

const style = {
  "version": 8,
	"sources": {
    "osm": {
			"type": "raster",
			"tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
			"tileSize": 256,
      "attribution": "&copy; OpenStreetMap Contributors",
      "maxzoom": 19
    }
  },
  "layers": [
    {
      "id": "osm",
      "type": "raster",
      "source": "osm" // This must match the source key above
    }
  ]
};

const map = new maplibregl.Map({
  container: 'map',
  style, // stylesheet location
  center: [-74.107807, 4.6482975], // starting position [lng, lat]
  zoom: 14
});

map.addControl(draw, 'top-right');

// elem.addEventListener('build', (e) => { /* … */ }, false);

const PolygonView = {
  data() {
    return {
      polygon: {}
    }
  },
  methods: {
    setPolygon(polygon) {
      console.log('set polygon')
      this.polygon = JSON.stringify(polygon, null, 2)
    }
  },

  template: `<pre><code>{{ polygon }}</code></pre>`
}

const polygonView = createApp(PolygonView).mount('#polygon-view')

const CameraParams = {
  data() {
    return {
      focalLength: 8.4,
      imageWidth: 5472,
      imageHeight: 3648,
      sensorWidth: 13.31,
      sensorHeight: 8.88,
      verticalDistance: 50
    }
  },
  methods: {
  },
  computed: {
    GDSW () {
      return  ((this.sensorWidth / 10) / this.imageWidth ) * (this.verticalDistance * 100) / (this.focalLength / 10) 
    }, 
    GDSH () {
      return   ((this.sensorHeight / 10) / this.imageHeight )  * (this.verticalDistance * 100) / (this.focalLength / 10)
    },
    CoverturaW () {
      return  (this.sensorWidth / 10) * (this.verticalDistance * 100) / (this.focalLength / 10) 
    }, 
    CoverturaH () {
      return   (this.sensorHeight / 10)  * (this.verticalDistance * 100) / (this.focalLength / 10)
    }
  },
  watch: {
    '$data': {
      handler: function (value) {
        console.log(value)
      },
      deep: true
    }
  },
  template: `
    <input type="number" v-model="focalLength" max="100" min="0" length="3" step="0.01"/> [mm]
    <input type="number" v-model="imageWidth" max="10000" min="0" /> [px]
    <input type="number" v-model="imageHeight" max="10000" min="0" /> [px]
    <input type="number" v-model="sensorWidth" max="100" min="0" step="0.01"/> [mm]
    <input type="number" v-model="sensorHeight"  max="100" min="0" step="0.01"/> [mm]
    <input type="number" v-model="verticalDistance"  max="500" min="0" step="10"/> [m]   
    <div class="font-mono">
      <div>GDS<sub>w</sub> = {{Math.round(GDSW * 100) / 100}} cm </div> 
      <div>GDS<sub>h</sub> = {{Math.round(GDSH * 100) / 100}} cm </div> 
      <div>Covertura<sub>w</sub> = {{Math.round(CoverturaW) / 100}} m </div> 
      <div>Covertura<sub>h</sub> = {{Math.round(CoverturaH) / 100}} m </div> 
    </div>
  `
}

const cameraParams = createApp(CameraParams).mount('#camera-params')

console.log(cameraParams)
map.on('draw.create', e => {
  const newFeature = e.features[0]
  console.log(`--${newFeature.id}--`)
  draw
    .getAll()
    .features
    .map(f =>
      f.id !== newFeature.id &&
      draw.delete(f.id)
    )

  // console.log(newFeature)s
  // console.log(cameraParams.CoverturaW)
    
  const coordinates = newFeature.geometry.coordinates
  console.log(coordinates[0][0])

  const x1 = geolib.computeDestinationPoint(
    coordinates[0][0],
    cameraParams.CoverturaH / 200,
    0
  )

  const x2 = geolib.computeDestinationPoint(
    coordinates[0][0],
    cameraParams.CoverturaW / 200,
    270
  )

  const x3 = geolib.computeDestinationPoint(
    coordinates[0][0],
    cameraParams.CoverturaH / 200,
    180
  )

  const x4 = geolib.computeDestinationPoint(
    coordinates[0][0],
    cameraParams.CoverturaW / 200,
    90
  )

  const bta = {
    id: 'bta',
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [-74.107807, 4.6482975] }
  };

  const feature = {
    id: 'unique-id',
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[
      [x4.longitude, x1.latitude],
      [x2.longitude, x1.latitude],
      [x2.longitude, x3.latitude],
      [x4.longitude, x3.latitude],
      [x4.longitude, x1.latitude],
    ]] }
  };
  // console.log(geolib.computeDestinationPoint(coordinates[0], 100, 20), 'fist coordinate', coordinates[0][0])
  console.log('feature', feature)
  console.log('bta', bta)
  draw.add(bta)
  draw.add(feature)
  polygonView.setPolygon(newFeature)
})