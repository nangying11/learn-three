import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#08090d");
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 1.5, 0);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    container?.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);

    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    scene.add(directionalLight);

    const group = new THREE.Group();

    const loader = new GLTFLoader();
    async function loadmodel() {
      const glbfile = await loader.loadAsync("/models/cbbc97b8c19a.glb");
      console.log(glbfile, "glbfile");

      if (disposed) {
        // 组件已卸载，不再使用本次加载结果
        glbfile.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        });
      }
      const model = glbfile.scene;
      group.add(model);
      scene.add(glbfile.scene);
      // 9. 计算原始包围盒
      const Box3 = new THREE.Box3().setFromObject(cube2);

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();

      Box3.getCenter(center);
      Box3.getSize(size);

      // 2. 计算缩放比例
      const maxSize = Math.max(size.x, size.y, size.z);
      const targetSize = 5;
      const scale = targetSize / maxSize;

      group.scale.setScalar(scale);

      const groundY = 0;

      group.position.set(
        -center.x * scale,
        groundY - Box3.min.y * scale,
        -center.z * scale,
      );

      console.log("原始中心:", center);
      console.log("原始尺寸:", size);
      console.log("缩放比例:", scale);
      console.log("最终包围盒:", finalBox);
      renderer.render(scene, camera);
    }

    loadmodel();
    const geometry2 = new THREE.BoxGeometry(2, 4, 2);

    const material2 = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
    });

    const cube2 = new THREE.Mesh(geometry2, material2);
    cube2.position.set(5, 3, -2);

    group.add(cube2);
    scene.add(group);

    // 5. 重新计算最终包围盒
    const finalBox = new THREE.Box3().setFromObject(group);

    const helper = new THREE.Box3Helper(finalBox, 0xffff00);

    scene.add(helper);
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const grid = new THREE.GridHelper(20, 20);
    scene.add(grid);

    console.log(scene, "scene");
    renderer.render(scene, camera);

    return () => {
      scene.remove(cube2);
      geometry2.dispose();
      material2.dispose();
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}

export default App;
