"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type Tool = "Select" | "Hide" | "Fade";
export type SceneHandle = {
  reset: () => void;
  zoom: (factor: number) => void;
  select: (name: string, tool: Tool) => void;
  clearSelection: () => void;
};
type MeshAsset = {
  name: string;
  layer: "skin" | "respiratory";
  textured: boolean;
  positions: string;
  indices: string;
  uvs?: string;
};
type AnatomyMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
type Props = {
  skin: number;
  respiratory: number;
  tool: Tool;
  drawing: boolean;
  onSelect: (name: string) => void;
  onReady: () => void;
  onError: () => void;
};
const initialEye = new THREE.Vector3(-0.571144, 1.644043, -0.979442);
const initialTarget = new THREE.Vector3(-0.025, 1.47, 0);
function decode(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  return bytes.buffer;
}

export const AnatomyScene = forwardRef<SceneHandle, Props>(
  function AnatomyScene(props, ref) {
    const container = useRef<HTMLDivElement>(null);
    const current = useRef(props);
    useEffect(() => {
      current.current = props;
    }, [props]);
    const engine = useRef<{
      renderer: THREE.WebGLRenderer;
      camera: THREE.PerspectiveCamera;
      controls: OrbitControls;
      meshes: AnatomyMesh[];
      clear: () => void;
    } | null>(null);
    function select(name: string, tool: Tool) {
      const state = engine.current;
      if (!state) return;
      state.clear();
      const matches = state.meshes.filter(
        (mesh) =>
          mesh.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(mesh.name.toLowerCase()),
      );
      if (!matches.length) {
        const group = /sinus|nasal|ethmoid|frontal/i.test(name)
          ? "Nasal"
          : /bronch/i.test(name)
            ? "Bronchi"
            : /pharyn|auditory/i.test(name)
              ? "Pharynx"
              : /clothes|hair|eyebrow|eyelash/i.test(name)
                ? "Body"
                : "Larynx";
        matches.push(
          ...state.meshes.filter((mesh) => mesh.name.includes(group)),
        );
      }
      matches.forEach((mesh) => {
        if (tool === "Hide") mesh.userData.hidden = true;
        else if (tool === "Fade") mesh.userData.faded = true;
        else {
          mesh.material.emissive.set("#e5b000");
          mesh.material.emissiveIntensity = 0.38;
        }
      });
    }
    useImperativeHandle(ref, () => ({
      reset() {
        const state = engine.current;
        if (!state) return;
        state.camera.position.copy(initialEye);
        state.controls.target.copy(initialTarget);
        state.controls.update();
        state.meshes.forEach((mesh) => {
          mesh.userData.hidden = false;
          mesh.userData.faded = false;
          mesh.material.emissive.set(0);
        });
      },
      zoom(factor) {
        const state = engine.current;
        if (!state) return;
        state.camera.position
          .sub(state.controls.target)
          .multiplyScalar(factor)
          .add(state.controls.target);
        state.controls.update();
      },
      select,
      clearSelection() {
        engine.current?.clear();
      },
    }));
    useEffect(() => {
      const host = container.current;
      if (!host) return;
      let stopped = false;
      let frame = 0;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#f4f4f4");
      const organs = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
      camera.position.copy(initialEye);
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true,
        });
      } catch {
        current.current.onError();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.autoClear = false;
      host.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(initialTarget);
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.minDistance = 0.15;
      controls.maxDistance = 3.5;
      controls.zoomSpeed = 0.6;
      controls.update();
      scene.add(new THREE.AmbientLight(0xffffff, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(-1.9, 2.1, -0.75);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 1.2);
      fill.position.set(0.3, 1.5, 1.1);
      scene.add(fill);
      scene.children.forEach((light) => organs.add(light.clone()));
      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      organs.add(new THREE.AmbientLight(0xffffff, 0.4));
      const meshes: AnatomyMesh[] = [];
      const clear = () =>
        meshes.forEach((mesh) => mesh.material.emissive.set(0));
      engine.current = { renderer, camera, controls, meshes, clear };
      // Standard image textures also work on mobile GPUs without S3TC/DXT.
      const loader = new THREE.TextureLoader();
      const textures: THREE.Texture[] = [];
      const loadTexture = async (
        name: string,
        colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
      ) => {
        const texture = await loader.loadAsync(
          `/sites/biodigital/respiratory-${name}.png`,
        );
        texture.colorSpace = colorSpace;
        texture.flipY = false;
        if (stopped) texture.dispose();
        else textures.push(texture);
        return texture;
      };
      const controller = new AbortController();
      const model = fetch("/sites/biodigital/anatomy.json", {
        signal: controller.signal,
      }).then((response): Promise<{ meshes: MeshAsset[] }> => {
        if (!response.ok) throw new Error("Anatomy asset unavailable");
        return response.json();
      });
      Promise.all([
        model,
        loadTexture("color", THREE.SRGBColorSpace),
        loadTexture("normal"),
        loadTexture("roughness"),
      ])
        .then(([data, color, normal, roughness]) => {
          if (stopped) return;
          data.meshes.forEach((asset) => {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
              "position",
              new THREE.BufferAttribute(
                new Float32Array(decode(asset.positions)),
                3,
              ),
            );
            geometry.setIndex(
              new THREE.BufferAttribute(
                new Uint32Array(decode(asset.indices)),
                1,
              ),
            );
            if (asset.uvs)
              geometry.setAttribute(
                "uv",
                new THREE.BufferAttribute(
                  new Float32Array(decode(asset.uvs)),
                  2,
                ),
              );
            geometry.computeVertexNormals();
            // Average coincident vertices while retaining the atlas UV seams.
            const positions = geometry.getAttribute("position");
            const normals = geometry.getAttribute("normal");
            const averages = new Map<string, THREE.Vector3>();
            const keys: string[] = [];
            for (let i = 0; i < positions.count; i++) {
              const key = [
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i),
              ]
                .map((value) => Math.round(value * 100000))
                .join(",");
              keys.push(key);
              const sum = averages.get(key) || new THREE.Vector3();
              sum.add(
                new THREE.Vector3(
                  normals.getX(i),
                  normals.getY(i),
                  normals.getZ(i),
                ),
              );
              averages.set(key, sum);
            }
            for (let i = 0; i < normals.count; i++) {
              const normal = averages.get(keys[i])!.clone().normalize();
              normals.setXYZ(i, normal.x, normal.y, normal.z);
            }
            const skin = asset.layer === "skin";
            const material = new THREE.MeshStandardMaterial(
              skin
                ? { color: "#f5f5f5", roughness: 0.9, side: THREE.DoubleSide }
                : asset.textured
                  ? {
                      map: color,
                      normalMap: normal,
                      normalScale: new THREE.Vector2(0.2, 0.2),
                      roughnessMap: roughness,
                      roughness: 1,
                      side: THREE.DoubleSide,
                    }
                  : {
                      color: "#b4b8bc",
                      roughness: 0.8,
                      side: THREE.DoubleSide,
                    },
            );
            if (skin)
              material.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                  "#include <opaque_fragment>",
                  "outgoingLight *= 1.0 - 0.32 * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);\n#include <opaque_fragment>",
                );
              };
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = asset.name;
            mesh.userData.layer = skin ? "skin" : "respiratory";
            meshes.push(mesh);
            (skin ? scene : organs).add(mesh);
          });
          current.current.onReady();
        })
        .catch((error) => {
          if (!stopped && error.name !== "AbortError")
            current.current.onError();
        });
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let start = { x: 0, y: 0 };
      const down = (event: PointerEvent) => {
        start = { x: event.clientX, y: event.clientY };
      };
      const up = (event: PointerEvent) => {
        if (
          current.current.drawing ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
        )
          return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(
          meshes.filter(
            (mesh) => mesh.visible && mesh.userData.layer === "respiratory",
          ),
        )[0];
        if (hit) {
          select(hit.object.name, current.current.tool);
          current.current.onSelect(hit.object.name);
        } else clear();
      };
      renderer.domElement.addEventListener("pointerdown", down);
      renderer.domElement.addEventListener("pointerup", up);
      function animate() {
        frame = requestAnimationFrame(animate);
        controls.enabled = !current.current.drawing;
        for (const mesh of meshes) {
          if (mesh.userData.layer === "skin") {
            mesh.visible = current.current.skin > 0 && !mesh.userData.hidden;
            mesh.material.opacity =
              Math.min(current.current.skin / 82, 1) *
              (mesh.userData.faded ? 0.15 : 1);
            mesh.material.transparent = mesh.material.opacity < 1;
          } else {
            mesh.visible =
              current.current.respiratory > 0 && !mesh.userData.hidden;
            mesh.material.opacity =
              (current.current.respiratory / 100) *
              (mesh.userData.faded ? 0.15 : 1);
            mesh.material.transparent = mesh.material.opacity < 1;
            mesh.material.depthWrite = mesh.material.opacity === 1;
          }
        }
        controls.update();
        renderer.clear();
        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(organs, camera);
      }
      animate();
      return () => {
        stopped = true;
        controller.abort();
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener("pointerdown", down);
        renderer.domElement.removeEventListener("pointerup", up);
        meshes.forEach((mesh) => {
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
        textures.forEach((texture) => texture.dispose());
        renderer.dispose();
        renderer.domElement.remove();
        engine.current = null;
      };
    }, []);
    return <div ref={container} className="bd-canvas" />;
  },
);
