const { createApp } = Vue
const emitter = mitt()
const DEBUG = false;

Math.grados = function(radianes) {
  return radianes * 180 / Math.PI;
};

Math.radianes = function(grados) {
  return Math.PI * grados / 180;
};

const initMap = () => {
  const draw = new MapboxDraw({
    controls: {
      combine_features: false,
      point: false,
      line_string: false,
      uncombine_features: false
    },
    mode: 'draw_polygon'
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
    style, 
    center: [-74.107807, 4.6482975], // [lng, lat]
    zoom: 17
  });
  
  map.addControl(draw, 'top-right');

  return [map, draw]
}

const [map, draw] = initMap()

const Control = {
  data() {
    return {
      focalLength: 8.4,
      imageWidth: 5472,
      imageHeight: 3648,
      sensorWidth: 13.31,
      sensorHeight: 8.88,
      flyHeight: 50,
      overlap: 80,
      sidelap: 80,
      angle: 0,
      showFrames: false,
      showCameras: true,
      images: 0,
      area: 0,
      route: null
    }
  },
  methods: {
    setArea(area) {
      this.area = area
    },
    setImages(images) {
      this.images = images
    },
    setRoute(route) {
      this.route = route
    }
  },
  computed: {
    GDSW () {
      return  ((this.sensorWidth / 10) / this.imageWidth ) * (this.flyHeight * 100) / (this.focalLength / 10) 
    }, 
    GDSH () {
      return   ((this.sensorHeight / 10) / this.imageHeight )  * (this.flyHeight * 100) / (this.focalLength / 10)
    },
    CoverturaW () {
      return  (this.sensorWidth / 10) * (this.flyHeight * 100) / (this.focalLength / 10) 
    }, 
    CoverturaH () {
      return   (this.sensorHeight / 10)  * (this.flyHeight * 100) / (this.focalLength / 10)
    }
  },
  watch: {
    focalLength () {
      emitter.emit("control.update")
    },
    imageWidth () {
      emitter.emit("control.update")
    },
    imageHeight () {
      emitter.emit("control.update")
    },
    sensorWidth () {
      emitter.emit("control.update")
    },
    sensorHeight () {
      emitter.emit("control.update")
    },
    flyHeight () {
      emitter.emit("control.update")
    },
    overlap () {
      emitter.emit("control.update")
    },
    sidelap () {
      emitter.emit("control.update")
    },
    angle () {
      emitter.emit("control.update")
    },
    showFrames () {
      emitter.emit("control.update")
    },
    showCameras () {
      emitter.emit("control.update")
    }
  },
  template: `
    <h2 class="text-center mb-2">Params</h2>
    <div class="grid grid-cols-2 w-80 mx-2 mb-5 font-mono">
      <label>Focal Length : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="focalLength" max="100" min="0"  step="0.01"/> [mm]
      </span>
      
      <label>Image Width : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="imageWidth" max="100000" min="0"  step="1"/> [px]
      </span>

      <label>Image Height : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="imageHeight" max="100000" min="0"  step="1"/> [px]
      </span>

      <label>Sensor Width : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="sensorWidth" max="100" min="0"  step="0.01"/> [mm]
      </span>

      <label>Sensor Height : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="sensorHeight" max="100" min="0"  step="0.01"/> [mm]
      </span>

      <label>Fly Height : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="flyHeight" max="1000" min="0"  step="10"/> [m]
      </span>

      <label>Angle : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="angle" max="360" min="0"  step="1"/> [º]
      </span>

      <label>Overlap : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="overlap" max="99" min="0"  step="1"/> [%]
      </span>

      <label>Sidelap : </label>
      <span class="align-middle">
        <input class="border block-inline text-right w-24" type="number" v-model="sidelap" max="99" min="0"  step="1"/> [%]
      </span>
  
      <label>Show Frames : </label>
      <span class="align-middle">
        <input type="checkbox" v-model="showFrames" />
      </span>


      <label>Show Cameras : </label>
      <span class="align-middle">
        <input type="checkbox" v-model="showCameras" />
      </span>
    </div>
    
    <div class="font-mono mb-3 mx-2">
      <div>GDS<sub>w</sub> = {{Math.round(GDSW * 100) / 100}} cm </div> 
      <div>GDS<sub>h</sub> = {{Math.round(GDSH * 100) / 100}} cm </div> 
      <div>Covertura<sub>w</sub> = {{Math.round(CoverturaW) / 100}} m </div> 
      <div>Covertura<sub>h</sub> = {{Math.round(CoverturaH) / 100}} m </div> 
      <div>Area = {{area}} m² </div> 
      <div>Images = {{images}}</div> 
    </div>

    <div class="text-center mb-3">
      <button class="px-4 py-2 font-semibold text-sm bg-sky-500 text-white rounded-none shadow-sm"> Download Lichit CVS</button>
    </div>
  `
}

const control = createApp(Control).mount('#control')
console.log(control)
const updateRoute = (draw, polygon, control) => {
  if (!polygon) return
  
  control.setArea(turf.area(polygon))
  const { CoverturaW, CoverturaH, angle, sidelap, overlap, showCameras, showFrames } = control
  const stepW = CoverturaW / 100000 * (1 - (sidelap / 100))
  const stepH = CoverturaH / 100000 * (1 - (overlap / 100))

  const route = genRoute(angle, stepW, polygon)  

  control.setRoute(route)

  const points = route
  .reduce((points, s) => {
    const distance = turf.distance(s[0], s[1])
    const angle = turf.bearing(s[0], s[1])


    return [
      ...points, 
      ...Array(Math.ceil( distance / stepH))
        .fill(null)
        .map((_, i) => turf.rhumbDestination(s[0], stepH * i, angle))
    ]
  }, [])


  control.setImages(points.length)

  points
  .map(p => {
    showFrames && draw.add(frame(CoverturaW, CoverturaH, angle, p))
    showCameras && draw.add(p)
  })

  draw.add(
    {
      id: 'gf-route',
      type: 'Feature',
      properties: {},
      geometry: { 
        type: 'LineString', 
        coordinates: route
          .map(s => [s[0].geometry.coordinates, s[1].geometry.coordinates]) 
          .reduce((aco, cur) => [...aco, cur[0], cur[1]])
      }
    }
  )
} 

const genRoute = (angle, step, polygon) => {
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
    console.log('angle', angle)
    console.log('α', alfa)
    console.log('β', beta)
    console.log('h', hypot)
    console.log('C------B')
    console.log('|++++/+|')
    console.log('|+++/++|')
    console.log('|α /β++|')
    console.log('A______D')

    draw.add({
      id: 'gf-debug-1',
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [
        [bbox[0], bbox[1]],
        [bbox[0], bbox[3]]
      ]}
    })
  
    draw.add({
      id: 'gf-debug-2',
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [
        [bbox[0], bbox[3]],
        [bbox[2], bbox[3]]
      ]}
    })
  
    draw.add({
      id: 'gf-debug-3',
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [
        [bbox[0], bbox[3]],
        [bbox[2], bbox[1]]
      ]}
    })
  
    draw.add({
      id: 'gf-debug-4',
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [
        [bbox[2], bbox[3]],
        [bbox[0], bbox[1]]
      ]}
    })
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
 
  const route = Array(segments + 1).fill(null)
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

const frame = (CoverturaW, CoverturaH, angle, origin) => {
  const hypot = Math.hypot(CoverturaH , CoverturaW) / 200000
  const offsetAngle = (angle - 90) % 360
  const teta = Math.grados(Math.atan2(CoverturaH , CoverturaW))

  const x1 = turf.rhumbDestination(origin, hypot,teta + offsetAngle).geometry.coordinates
  const x2 = turf.rhumbDestination(origin, hypot, 180 - teta + offsetAngle).geometry.coordinates
  const x3 = turf.rhumbDestination(origin, hypot, 180 + teta + offsetAngle).geometry.coordinates
  const x4 = turf.rhumbDestination(origin, hypot, 360 - teta + offsetAngle).geometry.coordinates
    
  return {
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

// Not is the best route only findNearest
const findNearest = (point, lines) => {
  const { nearest, others } = lines
    .map(l => ({ p: l, d: l.map(p => turf.distance(point, p)) }))
    .reduce((result, current) => {
      
      if (result.nearest === null) {
        return {
          ...result,
          nearest: current
        }
      }
      
      if (Math.min(...result.nearest.d) < Math.min(...current.d)) {
        return {
          ...result, 
          others: [...result.others, current] 
        }
      }

      return { nearest: current, others: [result.nearest, ...result.others] }
    }, { nearest: null, others: [] })


  return [
    nearest.d[0] < nearest.d[1] ? nearest.p : [nearest.p[1],nearest.p[0]], 
    ...others.map(o => o.p)
  ]
}

const sortRoute = lines => lines.length === 1 
  ? lines
  : [lines[0], ...sortRoute(findNearest(lines[0][1], lines.slice(1)))]


map.on('draw.create', e => {
  const polygon = {
    ...e.features[0],
    id: 'polygon',
  }
  draw.getAll().features.map(f => draw.delete(f.id))
  draw.add(polygon)
  updateRoute(draw, polygon, control)
})

map.on('draw.update', () => {
  draw.getAll().features.map(f => f.id !== 'polygon' && draw.delete(f.id))
  updateRoute(draw, draw.get('polygon'), control)
})

emitter.on('control.update', () => {
  draw.getAll().features.map(f => f.id !== 'polygon' && draw.delete(f.id))
  updateRoute(draw, draw.get('polygon'), control)
});