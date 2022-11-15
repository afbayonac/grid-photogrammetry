const { createApp } = Vue

Math.grados = function(radianes) {
  return radianes * 180 / Math.PI;
};

Math.radianes = function(grados) {
  return Math.PI * grados / 180;
};

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
  zoom: 17
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
      verticalDistance: 50,
      angle: 0
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
    <input type="number" v-model="angle"  max="359" min="0" step="1"/> [º]   
    <div class="font-mono">
      <div>GDS<sub>w</sub> = {{Math.round(GDSW * 100) / 100}} cm </div> 
      <div>GDS<sub>h</sub> = {{Math.round(GDSH * 100) / 100}} cm </div> 
      <div>Covertura<sub>w</sub> = {{Math.round(CoverturaW) / 100}} m </div> 
      <div>Covertura<sub>h</sub> = {{Math.round(CoverturaH) / 100}} m </div> 
    </div>
  `
}

const params = createApp(CameraParams).mount('#params')

map.on('draw.create', e => {
  const polygon = e.features[0]
  console.log(`--- ${polygon.id} ---`)
  draw
    .getAll()
    .features
    .map(f =>
      f.id !== polygon.id &&
      draw.delete(f.id)
    )

  const { CoverturaW, CoverturaH, angle } = params
  const CoverturaHKm = CoverturaH / 100000
  const CoverturaWKm = CoverturaW / 100000
  
  // Boundary box
  const bbox = turf.bbox(polygon);
  const pointA = turf.point([bbox[0], bbox[1]])
  const pointB = turf.point([bbox[2], bbox[3]])
  const pointC = turf.point([bbox[0], bbox[3]])
  const pointD = turf.point([bbox[2], bbox[1]])

  // .....C------B
  // .....|+++++/|
  // .....|+++/++|
  // .....|α /β+++|
  // .....A______D
  
  const alfa = turf.bearing(pointA, pointB) 
  const beta = Math.abs(90 - alfa)
  const hypot = turf.distance(pointA, pointB)

  console.log('α', alfa)
  console.log('β', beta)
  console.log('angle', angle)
  console.log('hypot', hypot)
  console.log('CoverturaHKm', CoverturaHKm)
  console.log('CoverturaWKm', CoverturaWKm)
  
  draw.add({
    id: 'segmet-1',
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [
      [bbox[0], bbox[1]],
      [bbox[0], bbox[3]]
    ]}
  })

  draw.add({
    id: 'segmet-2',
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [
      [bbox[0], bbox[3]],
      [bbox[2], bbox[3]]
    ]}
  })

  draw.add({
    id: 'segmet-3',
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [
      [bbox[0], bbox[3]],
      [bbox[2], bbox[1]]
    ]}
  })

  draw.add({
    id: 'segmet-4',
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [
      [bbox[2], bbox[3]],
      [bbox[0], bbox[1]]
    ]}
  })

  const angleI = angle % 180
  const d =  angleI > 90
  ? Math.abs((CoverturaWKm / 2) / Math.cos(Math.radianes((angleI - 90) - alfa)))
  : Math.abs((CoverturaWKm / 2) / Math.cos(Math.radianes(angleI - beta)));
  
  const segN = hypot / d
  const origin = angleI > 90 ? pointB : pointC
  const angleH = angleI > 90 ?  180 + alfa : 90 + beta 
  console.log(segN)
  console.log("d", d , beta, angleI)
  let line = 0
  
  console.log(angleH)
  while(line < segN) {
    console.log(angleH)
    const p0 = turf.rhumbDestination(origin, d * line, angleH)
    const p1 = turf.rhumbDestination(p0, hypot / 2, angleI).geometry.coordinates
    const p2 = turf.rhumbDestination(p0, hypot / 2, angleI + 180).geometry.coordinates
    console.log('line', line, p0)


    draw.add({
      id: `seg-${line}`,
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [
        p1,
        p2
      ]}
    })
    line ++
  }
  
  draw.add(frameFeature(CoverturaW, CoverturaH, angle, origin, '1'))
  polygonView.setPolygon(polygon)
})

const frameFeature = (CoverturaW, CoverturaH, angle, origin, id) => {
  const hypot = Math.hypot(CoverturaH , CoverturaW) / 200000
  const offsetAngle = (angle - 90) % 360
  const teta = Math.grados(Math.atan2(CoverturaH , CoverturaW))

  const x1 = turf.rhumbDestination(origin, hypot,teta + offsetAngle).geometry.coordinates
  const x2 = turf.rhumbDestination(origin, hypot, 180 - teta + offsetAngle).geometry.coordinates
  const x3 = turf.rhumbDestination(origin, hypot, 180 + teta + offsetAngle).geometry.coordinates
  const x4 = turf.rhumbDestination(origin, hypot, 360 - teta + offsetAngle).geometry.coordinates
    
  return {
    id: `frame-${id}`,
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[
      [x1[0], x1[1]],
      [x2[0], x2[1]],
      [x3[0], x3[1]],
      [x4[0], x4[1]],
      [x1[0], x1[1]],
    ]] }
  }
} 

