const { createApp } = Vue

// create map view 
const draw = new MapboxDraw({
  controls: {
    combine_features: false,
    point: false,
    line_string: false,
    uncombine_features: false
  }
});

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json', // stylesheet location
  center: [-74.5, 40], // starting position [lng, lat]
  zoom: 9 // starting zoom
});



map.addControl(draw, 'top-right');

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
      name: 'air 2s',
      focalLength: 8.5,
      imageWidth: 5472,
      imageHeight: 3648,
      sensorWidth: 13.31,
      sensorHeight: 8.88
    }
  },
  methods: {
    setPolygon(polygon) {
      console.log('set polygon')
      this.polygon = JSON.stringify(polygon, null, 2)
    }
  },
  template: `
    <div>
      inputs  
    </div>
  `
}
console.log(polygonView)

const cameraParams = createApp(CameraParams).mount('#camera-params')

map.on('draw.create', e => {
  const newFeature = e.features[0]
  draw
    .getAll()
    .features
    .map(f =>
      f.id !== newFeature.id &&
      draw.delete(f.id)
    )

  polygonView.setPolygon(newFeature)
})