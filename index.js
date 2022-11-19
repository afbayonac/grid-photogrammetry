const { createApp } = Vue

Math.grados = function(radianes) {
  return radianes * 180 / Math.PI;
};

Math.radianes = function(grados) {
  return Math.PI * grados / 180;
};

const DEBUG = true;
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
      overlap: 80,
      sidelap: 80,
      angle: 0,
      showFrames: true
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
    <input type="number" v-model="overlap"  max="99" min="0" step="1"/> [%]  
    <input type="number" v-model="sidelap"  max="99" min="0" step="1"/> [%]
    <input type="checkbox" v-model="showFrames" />
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

  const { CoverturaW, CoverturaH, angle, sidelap, overlap } = params
  // const CoverturaHKm = CoverturaH / 100000
  // const CoverturaWKm = CoverturaW / 100000
  
  // if (DEBUG) {
  //   console.log('CoverturaHKm', CoverturaHKm)
  //   console.log('CoverturaWKm', CoverturaWKm)
  // }

  const stepW = CoverturaW / 100000 * (1 - (sidelap / 100))
  const stepH = CoverturaH / 100000 * (1 - (overlap / 100))

  const route = getRoute(angle, stepW, polygon)  


  route.map(s => {
    const distance = turf.distance(s[0], s[1])
    const angle = turf.bearing(s[0], s[1])


    Array(Math.ceil( distance / stepH))
      .fill(null)
      .map((_, i) => turf.rhumbDestination(s[0], stepH * i, angle))
      .map((p)=> {
        draw.add(frameFeature(CoverturaW, CoverturaH, angle, p, '1'))
        draw.add(p)
      })

  })

  console.log(route)
  draw.add(
    {
      // id: 'debug-1',
      type: 'Feature',
      // properties: {},
      properties: {
        name: 'Aconcagua',
        height: 200
      },
      geometry: { 
        type: 'LineString', 
        coordinates: route
          .map(s => [s[0].geometry.coordinates, s[1].geometry.coordinates]) 
          .reduce((aco, cur) => [...aco, cur[0], cur[1]])
      }
    }
  )
  polygonView.setPolygon(polygon)
})


const getRoute = (angle, step, polygon) => {
  // Boundary box
  const bbox = turf.bbox(polygon);
  const pointA = turf.point([bbox[0], bbox[1]])
  const pointB = turf.point([bbox[2], bbox[3]])
  const pointC = turf.point([bbox[0], bbox[3]])
  // const pointD = turf.point([bbox[2], bbox[1]])

  const alfa = turf.bearing(pointA, pointB) 
  const beta = Math.abs(90 - alfa)
  const hypot = turf.distance(pointA, pointB)

  if (DEBUG) {
    // console.log('angle', angle)
    // console.log('α', alfa)
    // console.log('β', beta)
    // console.log('h', hypot)
    // console.log('C------B')
    // console.log('|++++/+|')
    // console.log('|+++/++|')
    // console.log('|α /β++|')
    // console.log('A______D')

    // draw.add({
    //   id: 'debug-1',
    //   type: 'Feature',
    //   properties: {},
    //   geometry: { type: 'LineString', coordinates: [
    //     [bbox[0], bbox[1]],
    //     [bbox[0], bbox[3]]
    //   ]}
    // })
  
    // draw.add({
    //   id: 'debug-2',
    //   type: 'Feature',
    //   properties: {},
    //   geometry: { type: 'LineString', coordinates: [
    //     [bbox[0], bbox[3]],
    //     [bbox[2], bbox[3]]
    //   ]}
    // })
  
    // draw.add({
    //   id: 'debug-3',
    //   type: 'Feature',
    //   properties: {},
    //   geometry: { type: 'LineString', coordinates: [
    //     [bbox[0], bbox[3]],
    //     [bbox[2], bbox[1]]
    //   ]}
    // })
  
    // draw.add({
    //   id: 'debug-4',
    //   type: 'Feature',
    //   properties: {},
    //   geometry: { type: 'LineString', coordinates: [
    //     [bbox[2], bbox[3]],
    //     [bbox[0], bbox[1]]
    //   ]}
    // })
  }

  const angleIdentity = angle % 180
  const stepCorrection =  angleIdentity > 90
    ? Math.abs(step / Math.cos(Math.radianes((angleIdentity - 90) - alfa)))
    : Math.abs(step / Math.cos(Math.radianes(angleIdentity - beta)));
  
  const segments = Math.floor(hypot / stepCorrection)
  const origin = angleIdentity > 90 ? pointB : pointC
  const angleH = angleIdentity > 90 ?  180 + alfa : 90 + beta 

  if (DEBUG) {
    console.log(step, stepCorrection)
  }
 
  const route = Array(segments + 1).fill({})
    .map((_, i) => {
      const p0 = turf.rhumbDestination(origin, stepCorrection * i, angleH)
      const p1 = turf.rhumbDestination(p0, hypot, angleIdentity).geometry.coordinates
      const p2 = turf.rhumbDestination(p0, hypot, angleIdentity + 180).geometry.coordinates
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [p1, p2] }
      }
    })
    .map(line => turf.lineIntersect(line, polygon).features
        .sort((a, b) => b.geometry.coordinates.reduce((aco, cur) => aco + cur, 0) - a.geometry.coordinates.reduce((aco, cur) => aco + cur, 0))
      )
    .filter(intersects => intersects.length > 0 && intersects.length % 2 === 0)
    .reduce((route, intersects) => {
      console.log('intersects', intersects)
      return [
        ...route, 
        ...Array(intersects.length / 2)
          .fill([])
          .map((_, i) => intersects.slice(2 * i, 2 * (i + 1)))
          .map(s => [
            s[0], 
            s[1]
          ]) 
      ]
    }, [])

    console.log(route)
    sortRoute(route)
    .map(([p1, p2]) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [p1.geometry.coordinates, p2.geometry.coordinates] }
    })) 
  
  if (DEBUG) {
    console.log(route)
  }

  return sortRoute(route)
}

const frameFeature = (CoverturaW, CoverturaH, angle, origin, id) => {
  const hypot = Math.hypot(CoverturaH , CoverturaW) / 200000
  const offsetAngle = (angle - 90) % 360
  const teta = Math.grados(Math.atan2(CoverturaH , CoverturaW))

  const x1 = turf.rhumbDestination(origin, hypot,teta + offsetAngle).geometry.coordinates
  const x2 = turf.rhumbDestination(origin, hypot, 180 - teta + offsetAngle).geometry.coordinates
  const x3 = turf.rhumbDestination(origin, hypot, 180 + teta + offsetAngle).geometry.coordinates
  const x4 = turf.rhumbDestination(origin, hypot, 360 - teta + offsetAngle).geometry.coordinates
    
  return {
    // id: `frame-${id}`,
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

const findNearest = (point, lines) => {
  const { nearest, others } = lines
    .map(l => ({ p: l, d: l.map(p => turf.distance(point, p)) }))
    .reduce((result, current) => {
      if (result.nearest === null) return {...result, nearest: current}
      if (Math.min(...result.nearest.d) < Math.min(...current.d)) return {...result, others: [...result.others, current] }
      return { nearest: current, others: [result.nearest, ...result.others] }
    }, { nearest: null, others: [] })

  if (nearest.d[0] < nearest.d[1]) return [nearest.p, ...others.map(o => o.p)]
  return [[nearest.p[1],nearest.p[0]], ...others.map(o => o.p)]
}

const sortRoute = lines => {
  if (lines.length === 1) {
    return lines
  }
  return [lines[0], ...sortRoute(findNearest(lines[0][1], lines.slice(1)))]
}
