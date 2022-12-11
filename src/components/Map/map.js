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

import dotsTexture from './textures/alpha-dot2.png'
// import dotsTexture from './textures/hmbb.jpeg'

import px from './textures/cube/px.png'
import py from './textures/cube/py.png'
import pz from './textures/cube/pz.png'
import nx from './textures/cube/nx.png'
import ny from './textures/cube/ny.png'
import nz from './textures/cube/nz.png'

import tag from './textures/tag.png'

// 墨卡托投影转换
const projection = d3
  .geoMercator()
  .center([104.0, 37.5])
  .scale(80)
  .translate([0, 0])

// 地图材质颜色
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#4350C1', '#008495']
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#357bcb', '#408db3']
// const COLOR_ARR = ['#0465BD', '#357bcb', '#3a7abd']
const HIGHT_COLOR = '#4fa5ff'

export default class LMap {
  constructor(container) {
    this.container = container ? container : document.body
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.group = new THREE.Group() // 各省份的标注（地名）
    this.renderer = null
    this.clock = new THREE.Clock()
    this.composer = null
    this.currentSelected = null
    this.raycaster = new THREE.Raycaster()
    // 当前鼠标位置
    // 不设置初始值的话是0,0 这样在刷新页面时会直接触发在0，0位置的模型被选中
    this.mousePointer = new THREE.Vector2(1000, 1000)
  }

  init() {
    this.initScene()
    this.initRenderer()
    this.initCamera()
    this.initControls()
    this.initAxis()

    this.createComposer()
    this.setResize()
    this.render()
    // this.initPlayGround()
    this.initRaycaster()
    this.initMap()
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.container.appendChild(this.renderer.domElement)

    return this.renderer
  }

  initScene() {
    const scene = new THREE.Scene()
    // scene.background = new THREE.Color(0x000000)
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
    camera.position.set(0, 20, 80)
    this.camera = camera
    this.camera.lookAt(new THREE.Vector3(0, 0, 0)) // 设置相机方向
    return camera
  }

  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
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
    const jsonData = require('./json/china.json')
    // 建一个空对象存放对象
    this.map = new THREE.Object3D()

    // 读取json数据
    const features = jsonData.features

    const texture = new THREE.TextureLoader().load(dotsTexture)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(0.5, 0.5) // 在一个纹理原图大小的基础上，重复多少次，1就是原图大小，2是在原图大小的基础上重复2次，则没张图显示为原来的一半

    // 遍历json数据
    features.forEach((feature, index) => {
      const provinceColor = new THREE.Color('rgb(13,47,104)')
      const province = new THREE.Object3D()
      province._color = provinceColor
      if (index === 0) {
        this.province = province
      }
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
          province.add(pathLine)

          // 使用shape创建平面
          const genShapePlane = (z, level) => {
            const geometry = new THREE.ShapeGeometry(shape)
            const material = new THREE.MeshBasicMaterial({
              color: provinceColor,
              transparent: true,
            })
            const mesh = new THREE.Mesh(geometry, material)
            mesh._province = province
            mesh._level = level
            mesh.position.z = z
            province.add(mesh)
            return mesh
          }
          const shapePlane1 = genShapePlane(4, 1)
          shapePlane1.material.alphaMap = texture

          const shapePlane2 = genShapePlane(3.95)
          shapePlane2.material.color.set('rgb(40, 133, 236)')
          const shapePlane3 = genShapePlane(3.9)
          shapePlane3.material.color.set('rgb(23, 85, 169)')
          const shapePlane4 = genShapePlane(3.85)
          shapePlane4.material.color.set('rgb(16, 56, 131)')

          // province.add(line)
          return
        })
      })

      // 将geo的属性放到省份模型中
      province.properties = feature.properties

      if (feature.properties.centroid) {
        // 面心坐标
        const [x, y] = projection(feature.properties.centroid)
        province.properties._centroid = [x, y]
      }

      this.map.add(province)
    })
    this.scene.add(this.map)
  }

  drawLine(points) {
    var up = new THREE.Vector3(0, 0, 30)
    // create PathPointList
    var pathPointList = new threePath.PathPointList()
    pathPointList.set(points, 0.3, 10, up, false) // 是否自动闭合
    // create geometry
    var geometry = new threePath.PathGeometry()
    geometry.update(pathPointList, {
      width: 0.05, // 线条宽度
      arrow: false, // 是否显示箭头
    })

    var material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
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
      0.7,
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

    function onPointerMove(event) {
      // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
      mousePointer.x = (event.clientX / window.innerWidth) * 2 - 1
      mousePointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onPointerMove)
  }

  updateRaycaster() {
    const highlightColor = new THREE.Color(0xff0000)
    const { scene, camera, raycaster, mousePointer, currentSelected } = this

    const unLightCurrent = () => {
      if (currentSelected) {
        currentSelected.children.forEach((mesh) => {
          if (mesh._level === 1) {
            mesh.material.color =  currentSelected._color
          }
        })
        this.currentSelected = null
      }
    }

    // 通过摄像机和鼠标位置更新射线
    raycaster.setFromCamera(mousePointer, camera)
    // 计算物体和射线的焦点
    const intersects = raycaster.intersectObjects(scene.children)
    let province
    for (const { object } of intersects) {
      province = object._province
      if (province) {
        if (province !== currentSelected) {
          unLightCurrent()
          province.children.forEach((mesh) => {
            if (mesh._level === 1) {
              mesh.material.color = highlightColor
            }
          })
          this.currentSelected = province
        }
        break
      }
    }

    if (!province) {
      // 取消高亮
      unLightCurrent()
    }

    // 只高亮一个
    // const selectedObject = intersects.find(
    //   (intersect) => intersect.object._canselect,
    // )?.object
  }

  setTag() {}

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

    this.renderer.render(this.scene, this.camera)
    this.composer && this.composer.render(delta) //效果组合器更新

    this.updateRaycaster()

    requestAnimationFrame(this.render.bind(this))
  }
}
