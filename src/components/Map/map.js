import * as THREE from "three";
import * as d3 from "d3";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator.js";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
// import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json'
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

import dotsTexture from "./textures/dot6.png";
// import dotsTexture from './textures/hmbb.jpeg'

import px from "./textures/cube/px.png";
import py from "./textures/cube/py.png";
import pz from "./textures/cube/pz.png";
import nx from "./textures/cube/nx.png";
import ny from "./textures/cube/ny.png";
import nz from "./textures/cube/nz.png";

import tag from "./textures/tag.png";

// 墨卡托投影转换
const projection = d3
  .geoMercator()
  .center([104.0, 37.5])
  .scale(80)
  .translate([0, 0]);

// 地图材质颜色
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#4350C1', '#008495']
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#357bcb', '#408db3']
// const COLOR_ARR = ['#0465BD', '#357bcb', '#3a7abd']
const HIGHT_COLOR = "#4fa5ff";

export class lineMap {
  constructor(container, el, options) {
    this.container = container ? container : document.body;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.provinceInfo = el; // dom用来显示省份信息
    const { tagClick = () => {} } = options;
    this.tagClick = tagClick;
  }

  init() {
    this.provinceInfo =
      this.provinceInfo || document.getElementById("provinceInfo");
    this.group = new THREE.Object3D(); // 标注（地名）

    this.selectedObject = null;
    // 渲染器
    // this.renderer = new THREE.WebGLRenderer();
    if (!this.renderer) {
      // antialias - 是否执行抗锯齿
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    }
    // this.renderer.outputEncoding = THREE.sRGBEncoding;
    // this.renderer.outputEncoding = THREE.sHSVEncoding; // 已移除 ，只有sRGBEncoding和LinearEncoding
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // 清除背景色，透明背景
    this.renderer.setClearColor(0xffffff, 0);

    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    // 场景
    this.scene = new THREE.Scene();
    // this.scene.background = null

    // probe
    this.lightProbe = new THREE.LightProbe();

    // this.scene.add(bulbLight)
    this.scene.add(this.lightProbe);

    // 相机 透视相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      5000
    );
    this.camera.position.set(0, -40, 70);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.setController(); // 设置控制

    this.setLight(); // 设置灯光

    this.setRaycaster();

    this.setPlayGround();

    this.animate();

    this.setTag();

    // this.loadFont(); // 加载字体

    this.loadMapData();

    this.setResize(); // 绑定浏览器缩放事件
  }

  setResize() {
    window.addEventListener("resize", this.resizeEventHandle.bind(this));
  }

  resizeEventHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
  }
  loadMapData() {
    let _this = this;

    let jsonData = require("./json/china.json");

    _this.initMap(jsonData);
  }

  loadFont() {
    //加载中文字体
    var loader = new THREE.FontLoader();
    var _this = this;
    loader.load("fonts/chinese.json", function (response) {
      _this.font = response;
      _this.loadMapData();
    });
  }

  createText(text, position) {
    var shapes = this.font.generateShapes(text, 1);

    var geometry = new THREE.ShapeBufferGeometry(shapes);

    var material = new THREE.MeshBasicMaterial();

    var textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(position.x, position.y, position.z);

    this.scene.add(textMesh);
  }

  initMap(chinaJson) {
    // 建一个空对象存放对象
    this.map = new THREE.Object3D();

    let _this = this;

    // 加载贴图材质
    const urls = [px, nx, py, ny, pz, nz];

    // 绘制地图
    new THREE.CubeTextureLoader().load(
      urls,
      function (cubeTexture) {
        // cubeTexture.encoding = THREE.sRGBEncoding;
        // _this.scene.background = cubeTexture;

        _this.lightProbe.copy(LightProbeGenerator.fromCubeTexture(cubeTexture));

        chinaJson.features.forEach((elem, index) => {
          // 定一个省份3D对象
          const province = new THREE.Object3D();
          // 每个的 坐标 数组
          const coordinates = elem.geometry.coordinates;
          // const color = COLOR_ARR[index % COLOR_ARR.length]
          // const color = '#0465BD'
          const color = "red";
          // 循环坐标数组
          coordinates.forEach((multiPolygon) => {
            multiPolygon.forEach((polygon) => {
              const shape = new THREE.Shape();

              for (let i = 0; i < polygon.length; i++) {
                let [x, y] = projection(polygon[i]);

                if (i === 0) {
                  shape.moveTo(x, -y);
                }
                shape.lineTo(x, -y);
              }

              const geometry = new THREE.ShapeGeometry(shape);

              const material = new THREE.MeshBasicMaterial({
                color: color,
              });

              const mesh = new THREE.Mesh(geometry, [material]);
              if (index % 2 === 0) {
                mesh.scale.set(1, 1, 1.2);
              }

              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh._color = color;
              province.add(mesh);
            });
          });

          // 将geo的属性放到省份模型中
          province.properties = elem.properties;
          if (elem.properties.centorid) {
            const [x, y] = projection(elem.properties.centorid);
            province.properties._centroid = [x, y];
          }

          _this.map.add(province);
        });

        _this.scene.environment = cubeTexture;
        // 销毁贴图
        cubeTexture.dispose();
        _this.scene.add(_this.map);
        // this.renderer.render();
      },
      () => {},
      (e) => {
        console.log(e);
      }
    );
  }

  // 绘制标注
  setTag(_data = []) {
    if (!_data || _data.length === 0) {
      return;
    }

    this.scene.remove(this.group);
    this.group = new THREE.Object3D();

    function paintTag(scale = 1) {
      let spriteMap = new THREE.TextureLoader().load(tag);

      _data.forEach((d) => {
        // 必须是不同的材质，否则鼠标移入时，修改材质会全部都修改
        let spriteMaterial = new THREE.SpriteMaterial({
          map: spriteMap,
          color: 0xffffff,
        });
        const { value } = d;
        // 添加标点
        const sprite1 = new THREE.Sprite(spriteMaterial);

        if (value && value.length !== 0) {
          let [x, y] = projection(value);
          sprite1.position.set(x, -y + 2, 6);
        }
        sprite1._data = d;
        sprite1.scale.set(2 * scale, 3 * scale, 8 * scale);

        this.group.add(sprite1);
      });
      spriteMap.dispose();
    }

    function setScale(scale = 1) {
      this.group.children.forEach((s) => {
        s.scale.set(2 * scale, 3 * scale, 8 * scale);
      });
    }

    this.scene.add(this.group);

    paintTag.call(this, 0.1);

    let tween = new TWEEN.Tween({ val: 0.1 })
      .to(
        {
          val: 1.2,
        },
        1.5 * 1000
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((d) => {
        //高度增加动画
        setScale.call(this, d.val);
      });
    tween.start();

    if (this.raycaster) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
    }
    this.renderer.render(this.scene, this.camera);
    console.log("render info", this.renderer.info);
    // TWEEN.update()
  }

  setRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.eventOffset = {};
    var _this = this;

    function onMouseMove(event) {
      // 父级并非满屏，所以需要减去父级的left 和 top
      let { top, left, width, height } =
        _this.container.getBoundingClientRect();
      let clientX = event.clientX - left;
      let clientY = event.clientY - top;

      _this.mouse.x = (clientX / width) * 2 - 1;
      _this.mouse.y = -(clientY / height) * 2 + 1;

      _this.eventOffset.x = clientX;
      _this.eventOffset.y = clientY;
      _this.provinceInfo.style.left = _this.eventOffset.x + 10 + "px";
      _this.provinceInfo.style.top = _this.eventOffset.y - 20 + "px";
    }

    // 标注
    function onPointerMove() {
      if (_this.selectedObject) {
        _this.selectedObject.material.color.set(0xffffff);
        _this.selectedObject = null;
      }

      if (_this.raycaster) {
        const intersects = _this.raycaster.intersectObject(_this.group, true);
        // console.log('select group', intersects)
        if (intersects.length > 0) {
          const res = intersects.filter(function (res) {
            return res && res.object;
          })[intersects.length - 1];

          if (res && res.object) {
            _this.selectedObject = res.object;
            _this.selectedObject.material.color.set("#f00");
          }
        }
      }
    }

    // 标注点击
    function onClick() {
      if (_this.selectedObject) {
        // 输出标注信息
        console.log(_this.selectedObject._data);
        _this.tagClick(_this.selectedObject._data);
      }
    }
    window.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("click", onClick);
  }

  // // 绘制地面

  setPlayGround() {
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x031837,
      // specular: 0x111111,
      metalness: 0,
      roughness: 1,
      // opacity: 0.2,
      opacity: 0.5,
      transparent: true,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000, 1, 1),
      groundMaterial
    );
    // ground.rotation.x = - Math.PI / 2;
    ground.position.z = 0;
    // ground.castShadow = true;
    ground.receiveShadow = true;

    this.scene.add(ground);
  }

  setLight() {
    let ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 环境光

    const light = new THREE.DirectionalLight(0xffffff, 0.5); // 平行光
    light.position.set(20, -50, 20);

    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    // 半球光
    let hemiLight = new THREE.HemisphereLight("#80edff", "#75baff", 0.3);
    // 这个也是默认位置
    hemiLight.position.set(20, -50, 0);
    this.scene.add(hemiLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(20, -50, 50);

    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
    pointLight2.position.set(50, -50, 20);
    pointLight2.castShadow = true;
    pointLight2.shadow.mapSize.width = 1024;
    pointLight2.shadow.mapSize.height = 1024;

    const pointLight3 = new THREE.PointLight(0xffffff, 0.5);
    pointLight3.position.set(-50, -50, 20);
    pointLight3.castShadow = true;
    pointLight3.shadow.mapSize.width = 1024;
    pointLight3.shadow.mapSize.height = 1024;

    this.scene.add(ambientLight);
    this.scene.add(light);
    this.scene.add(pointLight);
    this.scene.add(pointLight2);
    this.scene.add(pointLight3);
  }

  setController() {
    this.controller = new OrbitControls(this.camera, this.renderer.domElement);
    this.controller.update();
    /* this.controller.enablePan = false; // 禁止右键拖拽

        this.controller.enableZoom = true; // false-禁止右键缩放
        
        this.controller.maxDistance = 200; // 最大缩放 适用于 PerspectiveCamera
        this.controller.minDistance = 50; // 最大缩放

        this.controller.enableRotate = true; // false-禁止旋转 */

    /* this.controller.minZoom = 0.5; // 最小缩放 适用于OrthographicCamera
        this.controller.maxZoom = 2; // 最大缩放 */
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (this.raycaster) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // calculate objects intersecting the picking ray
      var intersects = this.raycaster.intersectObjects(
        this.scene.children,
      );
      if (this.activeInstersect && this.activeInstersect.length > 0) {
        // 将上一次选中的恢复颜色
        this.activeInstersect.forEach((element) => {
          const { object } = element;
          const { _color, material } = object;
          material[0].color.set(_color);
          material[1].color.set(_color);
        });
      }

      this.activeInstersect = []; // 设置为空
      // console.log('select', intersects)
      for (var i = 0; i < intersects.length; i++) {
        // debugger;
        if (
          intersects[i].object.material &&
          intersects[i].object.material.length === 2
        ) {
          this.activeInstersect.push(intersects[i]);
          intersects[i].object.material[0].color.set(HIGHT_COLOR);
          intersects[i].object.material[1].color.set(HIGHT_COLOR);
          break; // 只取第一个
        }
      }
    }
    this.createProvinceInfo();
    this.camera.updateMatrixWorld();
    this.controller.update();
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    }
    this.renderer.render(this.scene, this.camera);
    TWEEN.update();
  }

  createProvinceInfo() {
    // 显示省份的信息
    if (
      this.activeInstersect.length !== 0 &&
      this.activeInstersect[0].object.parent.properties.name
    ) {
      var properties = this.activeInstersect[0].object.parent.properties;

      this.provinceInfo.textContent = properties.name;

      this.provinceInfo.style.visibility = "visible";
    } else {
      this.provinceInfo.style.visibility = "hidden";
    }
  }

  // 丢失 context
  destroyed() {
    if (this.renderer) {
      this.renderer.forceContextLoss();
      this.renderer.dispose();
      this.renderer.domElement = null;
      this.renderer = null;
    }
    window.removeEventListener("resize", this.resizeEventHandle);
  }
}

export default class LMap {
  constructor(container) {
    this.container = container ? container : document.body;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.group = new THREE.Group(); // 各省份的标注（地名）
    this.renderer = null;
  }

  init() {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initAxis();

    this.animate();

    this.initMap();

    this.initPlayGround();

    this.setResize();

    this.setRaycaster();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    return this.renderer;
  }

  initScene() {
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x000000)
    this.scene = scene;
    return scene;
  }

  initCamera() {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      1,
      1000
    );
    camera.position.set(0, 20, 80);
    this.camera = camera;
    return camera;
  }

  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.update();
    this.controls = controls;
  }

  initAxis() {
    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);
  }

  setResize() {
    window.addEventListener("resize", this.resizeEventHandle.bind(this));
  }

  resizeEventHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    // 通过摄像机和鼠标位置更新射线
    if (this.raycaster) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // calculate objects intersecting the picking ray
      var intersects = this.raycaster.intersectObjects(
        this.scene.children,
        true
      );

      if (this.activeInstersect && this.activeInstersect.length > 0) {
        // 将上一次选中的恢复颜色
        this.activeInstersect.forEach((object) => {
          const { _color, material } = object;
          material.color.set(_color);
        });
      }

      this.activeInstersect = []; // 设置为空
      for (var i = 0; i < intersects.length; i++) {
        const object = intersects[i].object
        if (object._province) {
          object._province.children.forEach(extrudeMesh => {
            extrudeMesh.material.color.set(HIGHT_COLOR);
            this.activeInstersect.push(extrudeMesh)
          })
          break; // 只取第一个
        }
      }
    }
  }

  initMap() {
    if (!this) {
      // const points = []

      // points.push(new THREE.Vector2(0, 0))
      // points.push(new THREE.Vector2(0, 10))
      // points.push(new THREE.Vector2(10, 10))
      // points.push(new THREE.Vector2(8, 6))
      // points.push(new THREE.Vector2(10, 0))
      // points.push(new THREE.Vector2(0, 0))

      // const geometry = new THREE.BufferGeometry().setFromPoints(points)
      // const material = new THREE.LineBasicMaterial({ color: 'white' })
      // const line = new THREE.Line(geometry, material)

      // line.position.z = 10
      // this.scene.add(line)

      return;
    }

    const jsonData = require("./json/china.json");
    // 建一个空对象存放对象
    this.map = new THREE.Object3D();

    // 读取json数据
    const features = jsonData.features;

    const texture = new THREE.TextureLoader().load(dotsTexture);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.5, 0.5); // 在一个纹理原图大小的基础上，重复多少次，1就是原图大小，2是在原图大小的基础上重复2次，则没张图显示为原来的一半

    // 遍历json数据
    features.forEach((feature) => {
      const province = new THREE.Object3D();

      const coordinates = feature.geometry.coordinates;

      coordinates.forEach((multiPolygon) => {
        // multiPolygon 每个省份的多边形数组
        multiPolygon.forEach((polygon) => {
          // polygon - 多边形 内部是多个点（坐标数组）
          const shape = new THREE.Shape(); // Shape用来画多边形

          const points = [];
          for (let i = 0; i < polygon.length; i++) {
            let [x, y] = projection(polygon[i]); // 经纬度转二维投影坐标
            if (i === 0) {
              shape.moveTo(x, -y); // 移动线段起点
            }
            shape.lineTo(x, -y); // 从当前点画一条直线到(x,y)

            points.push(x, -y, 0);
          }

          const lineGeometry = new LineGeometry();
          lineGeometry.setPositions(points);
          const lineMaterial = new LineMaterial({
            color: "rgb(118, 206, 245)",
            transparent: true,
          });
          // const line = new THREE.Line(lineGeometry, lineMaterial)
          const line = new Line2(lineGeometry, lineMaterial);
          lineMaterial.resolution.set(this.width, this.height);

          line.computeLineDistances();
          line.position.z = 3;
          province.add(line);

          function genMapMesh() {
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({
              transparent: true,
            });
            const mesh = new THREE.Mesh(geometry, material);
            province.add(mesh);
            return mesh;
          }

          const mesh1 = genMapMesh();
          mesh1.material.map = texture;
          mesh1.position.z = 3;

          // const mesh2 = genMapMesh();
          // // 修改颜色
          // mesh2.material.color = new THREE.Color("rgb(41, 110, 203)");
          // mesh2.position.z = 2.98;
          // mesh2.position.y -= 0.1;
          // mesh2.position.x += 0.1;

          const extrudeSettings = {
            depth: 2.8,
            bevelEnabled: true,
            bevelSegments: 1,
            bevelThickness: 0.2,
          };

          const extrudeGeometry = new THREE.ExtrudeGeometry(
            shape,
            extrudeSettings
          );
          const extrudeMaterial = new THREE.MeshBasicMaterial({
            color: "#0465BD",
            // map: '' 这里也可以用贴图
          });

          const extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudeMaterial);
          extrudeMesh.position.z = 0;
          extrudeMesh._province = province
          extrudeMesh._color = "#0465BD"
          province.add(extrudeMesh);
        });
      });

      // 将geo的属性放到省份模型中
      province.properties = feature.properties;

      if (feature.properties.centroid) {
        // 面心坐标
        const [x, y] = projection(feature.properties.centroid);
        province.properties._centroid = [x, y];
      }

      this.map.add(province);
    });
    this.scene.add(this.map);
  }

  setTag(_data = []) {
    if (!_data?.length) return;
    // this.scene.remove(this.group)
    this.group = new THREE.Object3D();

    // 创建文字
    // const loader = new FontLoader();
    // loader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
    //   const geometry = new TextGeometry('Hello three.js!', {
    //     font: font,
    //     size: 4,
    //     height: 0.1,
    //   })
    // 	// 创建面材质
    // 	const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    // 	const text = new THREE.Mesh(geometry, material)
    // 	text.position.z = 10
    // 	this.scene.add(text)
    // })

    function paintTag(scale = 1) {
      let spriteMap = new THREE.TextureLoader().load(tag);

      _data.forEach((d) => {
        // 必须是不同的材质，否则鼠标移入时，修改材质会全部都修改
        let spriteMaterial = new THREE.SpriteMaterial({
          map: spriteMap,
          color: 0xffffff,
        });
        const { value } = d;
        // 添加标点
        const sprite1 = new THREE.Sprite(spriteMaterial);

        if (value && value.length !== 0) {
          let [x, y] = projection(value);
          sprite1.position.set(x, -y + 2, 6);
        }
        sprite1._data = d;
        sprite1.scale.set(20 * scale, 30 * scale, 80 * scale);

        this.group.add(sprite1);
      });
      spriteMap.dispose();
    }

    function setScale(scale = 1) {
      this.group.children.forEach((s) => {
        s.scale.set(2 * scale, 3 * scale, 8 * scale);
      });
    }

    this.scene.add(this.group);

    paintTag.call(this, 0.1);

    let tween = new TWEEN.Tween({ val: 0.1 })
      .to(
        {
          val: 1.2,
        },
        1.5 * 1000
      )
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((d) => {
        //高度增加动画
        setScale.call(this, d.val);
      });
    tween.start();

    if (this.raycaster) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
    }
    this.renderer.render(this.scene, this.camera);
    console.log("render info", this.renderer.info);
    // TWEEN.update()
  }

  // 设置射线 鼠标选中
  setRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.eventOffset = {};
    var _this = this;

    // 鼠标移动事件 控制
    function onMouseMove(event) {
      // 父级并非满屏，所以需要减去父级的left 和 top
      let { top, left, width, height } =
        _this.container.getBoundingClientRect();
      // 获取以容器左上角为原点的鼠标坐标
      let clientX = event.clientX - left;
      let clientY = event.clientY - top;

      _this.mouse.x = (clientX / width) * 2 - 1;
      _this.mouse.y = -(clientY / height) * 2 + 1;

      _this.eventOffset.x = clientX;
      _this.eventOffset.y = clientY;
      // _this.provinceInfo.style.left = _this.eventOffset.x + 10 + "px";
      // _this.provinceInfo.style.top = _this.eventOffset.y - 20 + "px";
    }

    // 标注
    function onPointerMove() {
      if (_this.selectedObject) {
        _this.selectedObject.material.color.set(0xffffff);
        _this.selectedObject = null;
      }

      if (_this.raycaster) {
        const intersects = _this.raycaster.intersectObject(_this.group, true);
        if (intersects.length > 0) {
          const res = intersects.filter(function (res) {
            return res && res.object;
          })[intersects.length - 1];

          if (res && res.object) {
            _this.selectedObject = res.object;
            _this.selectedObject.material.color.set("#f00");
          }
        }
      }
    }

    // 标注点击
    function onClick() {
      if (_this.selectedObject) {
        // 输出标注信息
        console.log(_this.selectedObject._data);
        _this.tagClick(_this.selectedObject._data);
      }
    }
    window.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("click", onClick);
  }

  // 绘制地面(平面)
  initPlayGround() {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    const material = new THREE.MeshBasicMaterial({ color: "rgb(4, 19, 40)" });
    const plane = new THREE.Mesh(geometry, material);
    // plane.rotation.x = -Math.PI / 2
    // plane.position.y = -5
    this.scene.add(plane);
  }
}
