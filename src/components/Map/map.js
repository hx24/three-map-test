import * as THREE from 'three'
import * as d3 from 'd3'
import TWEEN from '@tweenjs/tween.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
// import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import * as threePath from '@/assets/three.path/three.path.module'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// 引入CSS2DObject
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import dotsTexture from './textures/alpha-dot2.png'
// import dotsTexture from './textures/hmbb.jpeg'

// 墨卡托投影转换
const projection = d3
  .geoMercator()
  // .center([104.0, 37.5])
  .center([120.41, 29.58])
  .scale(160)
  .translate([0, 0])

// 地图材质颜色
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#4350C1', '#008495']
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#357bcb', '#408db3']
// const COLOR_ARR = ['#0465BD', '#357bcb', '#3a7abd']
const HIGHT_COLOR = '#4fa5ff'

export default class LMap {
  constructor(container) {
    this.container = container ? container : document.body
    this.cityInfo = document.getElementById('img')
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.group = new THREE.Group() // 各省份的标注（地名）
    this.renderer = null
    this.labelRenderer = null
    this.clock = new THREE.Clock()
    this.composer = null
    this.currentSelected = null
    this.raycaster = new THREE.Raycaster()
    // 当前鼠标位置
    // 不设置初始值的话是0,0 这样在刷新页面时会直接触发在0，0位置的模型被选中
    this.mousePointer = new THREE.Vector2(1000, 1000)
    this.cityMeshes = new THREE.Group()
  }

  init() {
    this.initScene()
    this.initRenderer()
    this.initCamera()
    this.initAxis()

    // this.createComposer()
    this.setResize()
    
    this.initLabelRenderer()
    this.initControls()

    // this.initPlayGround()
    this.initRaycaster()
    this.initMap()
    // this.setTag()
    this.render()
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ alpha: false })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.container.appendChild(this.renderer.domElement)
    return this.renderer
  }

  initLabelRenderer() {
    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(this.width, this.height)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = 0
    this.container.appendChild(this.labelRenderer.domElement)
  }

  initScene() {
    const scene = new THREE.Scene()
    // scene.background = new THREE.Color('#01203f')
    scene.background = new THREE.Color('white')
    this.scene = scene
    return scene
  }

  initCamera() {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      1,
      1000,
    )
    camera.position.set(0, -10, 14)
    this.camera = camera
    this.camera.lookAt(new THREE.Vector3(0, 0, 0)) // 设置相机方向
    return camera
  }

  initControls() {
    const controls = new OrbitControls(this.camera, this.labelRenderer.domElement)
    controls.update()
    this.controls = controls
  }

  initAxis() {
    const axesHelper = new THREE.AxesHelper(100)
    this.scene.add(axesHelper)
  }

  setResize() {
    window.addEventListener('resize', this.resizeEventHandle.bind(this))
  }

  resizeEventHandle() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height)
  }

  // 绘制地面(平面)
  initPlayGround() {
    const geometry = new THREE.PlaneGeometry(1000, 1000)
    const material = new THREE.MeshBasicMaterial({ color: 'rgb(4, 19, 40)' })
    const plane = new THREE.Mesh(geometry, material)
    // plane.rotation.x = -Math.PI / 2
    // plane.position.y = -5
    this.scene.add(plane)
  }

  initMap() {
    const jsonData = require('./json/zj.json')
    // 建一个空对象存放对象
    this.map = new THREE.Object3D()
    const cityMeshes = new THREE.Object3D()
    cityMeshes.name = '城市集合'
    const lineMeshes = new THREE.Object3D()
    lineMeshes.name = '城市线集合'

    // 读取json数据
    const features = jsonData.features

    const texture = new THREE.TextureLoader().load(dotsTexture)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(0.5, 0.5) // 在一个纹理原图大小的基础上，重复多少次，1就是原图大小，2是在原图大小的基础上重复2次，则没张图显示为原来的一半

    // 遍历json数据
    features.forEach((feature) => {
      console.log('feature', feature)
      const provinceColor = new THREE.Color('rgb(13,47,104)')
      const cityLines = new THREE.Object3D()
      const cityExtrudes = new THREE.Object3D()
      cityExtrudes.name = feature.properties.name
      const coordinates = feature.geometry.coordinates
      coordinates.forEach((multiPolygon) => {
        // multiPolygon 每个省份的多边形数组
        multiPolygon.forEach((polygon) => {
          const shape = new THREE.Shape()
          let line_vertices = []
          for (let i = 0; i < polygon.length; i++) {
            const [x, y] = projection(polygon[i])
            if (i === 0) shape.moveTo(x, -y)
            shape.lineTo(x, -y)
            line_vertices.push(new THREE.Vector3(x, -y, 4.007)) // 4.01是为了让线条在立体图形的上面
          }
          const pathLine = this.drawLine(line_vertices)
          cityLines.add(pathLine)

          const extrudeSettings = {
            depth: 0.3,
            bevelEnabled: false,
          }
          const extrudeGeometry = new THREE.ExtrudeGeometry(
            shape,
            extrudeSettings,
          )
          const extrudeMaterial = new THREE.MeshBasicMaterial({
            color: provinceColor || '#2defff',
            transparent: true,
            opacity: 0.8,
          })

          const extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudeMaterial)
          extrudeMesh.position.z = 3.7
          extrudeMesh._selected = true
          cityExtrudes.add(extrudeMesh)

          return
        })
      })

      // 将geo的属性放到省份模型中
      cityExtrudes.properties = feature.properties

      if (feature.properties.centroid) {
        // 面心坐标
        const [x, y] = projection(feature.properties.centroid)
        cityExtrudes.properties._centroid = [x, y]
      }

      lineMeshes.add(cityLines)
      cityMeshes.add(cityExtrudes)
      this.genCityInfo(feature)
    })
    this.cityMeshes = cityMeshes

    this.map.add(cityMeshes)
    this.map.add(lineMeshes)
    this.scene.add(this.map)
  }

  genCityInfo(feature) {
    const { properties } = feature
    const { name } = properties
    const { _centroid } = properties
    const [x, y] = _centroid

    const labelDom = document.createElement('div')
    labelDom.style.color = '#fff'
    labelDom.textContent = name

    const sprite = new CSS2DObject(labelDom)
    // 在map中显示sprite
    sprite.position.set(x, -y, 4.01)
    this.map.add(sprite)

  }

  drawLine(points) {
    var up = new THREE.Vector3(0, 0, 30)
    // create PathPointList
    var pathPointList = new threePath.PathPointList()
    pathPointList.set(points, 0.3, 10, up, false) // 是否自动闭合
    // create geometry
    var geometry = new threePath.PathGeometry()
    geometry.update(pathPointList, {
      width: 0.01, // 线条宽度
      arrow: false, // 是否显示箭头
    })

    var material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#abe9f9'),
      side: THREE.DoubleSide,
      transparent: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    // mesh.layers.set(1)
    // this.scene.add(mesh)
    return mesh
  }

  createComposer() {
    //使用场景和相机创建RenderPass通道
    const renderPass = new RenderPass(this.scene, this.camera)

    //创建UnrealBloomPass泛光通道
    // resolution: Vector2, strength: number, radius: number, threshold: number
    const unrealBloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.4,
      1.1,
      0.18,
    )
    unrealBloomPass.renderToScreen = true

    //创建效果组合器
    this.composer = new EffectComposer(this.renderer)

    //将创建的通道添加到EffectComposer(效果组合器)对象中
    this.composer.addPass(renderPass)
    this.composer.addPass(unrealBloomPass)
  }

  // 设置选中高亮
  initRaycaster() {
    const { mousePointer } = this
    const _this = this

    function onPointerMove(event) {
      // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
      mousePointer.x = (event.clientX / window.innerWidth) * 2 - 1
      mousePointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    function onClick(event) {
      if (_this.currentSelected) {
        // 父级并非满屏，所以需要减去父级的left 和 top
        let {
          top,
          left,
        } = _this.container.getBoundingClientRect()
        let clientX = event.clientX - left
        let clientY = event.clientY - top
  
        const eventOffsetX = clientX
        const eventOffsetY = clientY

        _this.cityInfo.style.left = eventOffsetX + 10 + 'px'
        _this.cityInfo.style.top = eventOffsetY - 20 + 'px'

        console.log('', _this.cityInfo.style.left, _this.cityInfo.style.top)

        const properties = _this.currentSelected
        console.log('properties', properties)
        const imgs = [require('@/assets/1.png'), require('@/assets/2.png')]
        _this.cityInfo.src = imgs[Math.random() > 0.5 ? 0 : 1]
        _this.cityInfo.style.visibility = 'visible'
      } else {
        _this.cityInfo.style.visibility = 'hidden'
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('click', onClick)
    window.addEventListener('mousedown', () => {
      _this.cityInfo.style.visibility = 'hidden'
    })
  }

  updateRaycaster() {
    const highlightColor = new THREE.Color(0xff0000)
    const {
      scene,
      camera,
      raycaster,
      mousePointer,
      currentSelected,
      cityMeshes,
    } = this

    const unLightCurrent = () => {
      if (currentSelected) {
        currentSelected.material.opacity = 0.8
        this.currentSelected = null
      }
    }

    // 通过摄像机和鼠标位置更新射线
    raycaster.setFromCamera(mousePointer, camera)
    
    // 计算物体和射线的焦点
    const intersects = raycaster.intersectObjects(this.cityMeshes.children)
    let selected
    for (const { object } of intersects) {
      if (object._selected) {
        selected = object
        if (object !== currentSelected) {
          unLightCurrent()
          object.material.opacity = 1
          this.currentSelected = object
        }
        break
      }
    }

    if (!selected) {
      // 取消高亮
      unLightCurrent()
    }
  }

  // 设置标注（地名）
  setTag() {
    const { cityMeshes } = this
    const tagGroup = new THREE.Group()
    cityMeshes.children.forEach((city) => {
      const { _centroid } = city.properties
      if (_centroid) {
        const [x, y] = _centroid
        const tag = this.createSpriteTag(city.properties.name)
        tag.position.set(x, -y, 4.6)
        tagGroup.add(tag)
      }
    })
    this.scene.add(tagGroup)
  }

  createSpriteTag(name) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const fontSize = 20
    const padding = 5
    // 设置字重
    ctx.font = `bold ${fontSize}px Arial`
    const textWidth = ctx.measureText(name).width
    console.log('textWidth', textWidth)
    canvas.width = textWidth + padding * 2
    canvas.height = fontSize + padding * 2
    ctx.font = `${fontSize}px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // 设置字体颜色
    ctx.fillStyle = '#fff'
    ctx.fillText(name, padding, fontSize + padding)

    const texture = new THREE.Texture(canvas)
    texture.needsUpdate = true
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      fog: false
      // transparent: true,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(0.6, 0.6, 1)
    return sprite
  }


  render() {
    const delta = this.clock.getDelta() // 获取自上次调用的时间差
    // this.renderer.render(this.scene, this.camera)
    this.controls.update()
    // 通过摄像机和鼠标位置更新射线

    // // // 注意下面的调用顺序不能错
    // this.renderer.autoClear = false
    // this.renderer.clear()
    // this.camera.layers.set(1)
    // // /********** 更新效果组合器一定要在渲染器更新后，否则通道无法产生效果************/
    // this.composer && this.composer.render(delta) //效果组合器更新
    // this.renderer.clearDepth()
    // this.camera.layers.set(0)
    // this.renderer.render(this.scene, this.camera)

    this.labelRenderer.render(this.scene, this.camera)
    this.renderer.render(this.scene, this.camera)
    this.composer && this.composer.render(delta) //效果组合器更新

    this.updateRaycaster()

    requestAnimationFrame(this.render.bind(this))
  }
}
