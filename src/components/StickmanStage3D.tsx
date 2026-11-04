import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StoryboardBeat } from '../types';
import { ChevronDown, ChevronUp, Camera, Sparkles, Layers } from 'lucide-react';

interface StickmanStage3DProps {
  beat: StoryboardBeat;
}

// Reusable scratch math objects allocated outside the animation loop (Zero-GC render loop)
const _targetCamPos = new THREE.Vector3(0, 2.4, 5.8);
const _targetLookAt = new THREE.Vector3(0, 1.2, 0);
const _currentLookAt = new THREE.Vector3(0, 1.2, 0);
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyColor = new THREE.Color();

export const StickmanStage3D: React.FC<StickmanStage3DProps> = ({ beat }) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const beatRef = useRef<StoryboardBeat>(beat);

  const [dockCollapsed, setDockCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [cameraPreset, setCameraPreset] = useState<'wide' | 'character' | 'chart' | 'crane'>('wide');
  const [explodedRatio, setExplodedRatio] = useState<number>(0);
  const [finishMode, setFinishMode] = useState<'studio_matte' | 'brushed_titanium' | 'cyber_gold'>('studio_matte');

  const controlsStateRef = useRef({
    cameraPreset: 'wide' as 'wide' | 'character' | 'chart' | 'crane',
    explodedRatio: 0,
    finishMode: 'studio_matte' as 'studio_matte' | 'brushed_titanium' | 'cyber_gold',
    userInteracting: false,
  });

  useEffect(() => {
    beatRef.current = beat;
  }, [beat]);

  useEffect(() => {
    controlsStateRef.current.cameraPreset = cameraPreset;
    controlsStateRef.current.explodedRatio = explodedRatio;
    controlsStateRef.current.finishMode = finishMode;
  }, [cameraPreset, explodedRatio, finishMode]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard per threejs skill
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, container.clientWidth || 800);
    const height = Math.max(240, container.clientHeight || 450);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x090d16);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x090d16, 0.045);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.4, 5.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 2.2;
    controls.maxDistance = 14;
    controls.target.set(0, 1.2, 0);

    controls.addEventListener('start', () => {
      controlsStateRef.current.userInteracting = true;
    });

    // 3. Balanced Studio Lighting Rig (Warm Directional Key + Cool Hemisphere Fill + Rim Light)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(4.5, 6.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
    rimLight.position.set(-4.0, 4.0, -3.5);
    scene.add(rimLight);

    // 4. Procedural Studio Stage Floor Texture (CanvasTexture with SRGBColorSpace & Max Anisotropy)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d')!;
    fCtx.fillStyle = '#0d1322';
    fCtx.fillRect(0, 0, 512, 512);
    fCtx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    fCtx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
      fCtx.beginPath();
      fCtx.moveTo(i, 0);
      fCtx.lineTo(i, 512);
      fCtx.stroke();
      fCtx.beginPath();
      fCtx.moveTo(0, i);
      fCtx.lineTo(512, i);
      fCtx.stroke();
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(8, 8);
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Soft radial contact shadow canvas texture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);

    const createContactShadow = (radius: number) => {
      const m = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), m);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.015; // Disjoint depth offset >= 0.015
      return disc;
    };

    // 5. Composite 10-Part Procedural 3D Stickman Explainer Actor (THREE.Group, grounded at y=0)
    const stickmanGroup = new THREE.Group();
    stickmanGroup.position.set(-1.15, 0, 0.2);
    scene.add(stickmanGroup);
    stickmanGroup.add(createContactShadow(0.65));

    const stickBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.2,
    });
    const stickJointMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.8,
    });
    const stickVisorMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });

    // Part 1: Left & Right Boots (Grounded at y=0)
    const bootGeo = new THREE.BoxGeometry(0.16, 0.1, 0.28);
    const leftBoot = new THREE.Mesh(bootGeo, stickJointMat);
    leftBoot.position.set(-0.18, 0.05, 0.04);
    const rightBoot = new THREE.Mesh(bootGeo, stickJointMat);
    rightBoot.position.set(0.18, 0.05, 0.04);
    stickmanGroup.add(leftBoot, rightBoot);

    // Part 2 & 3: Left & Right Legs
    const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.72, 16);
    const leftLeg = new THREE.Mesh(legGeo, stickBodyMat);
    leftLeg.position.set(-0.18, 0.45, 0);
    const rightLeg = new THREE.Mesh(legGeo, stickBodyMat);
    rightLeg.position.set(0.18, 0.45, 0);
    stickmanGroup.add(leftLeg, rightLeg);

    // Part 4: Pelvis & Spine Torso (Lathe/Cylinder)
    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.16, 16), stickJointMat);
    pelvisMesh.position.set(0, 0.84, 0);
    const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.68, 16), stickBodyMat);
    torsoMesh.position.set(0, 1.24, 0);
    stickmanGroup.add(pelvisMesh, torsoMesh);

    // Part 5: Neck Collar Ring
    const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 12, 24), stickJointMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.set(0, 1.6, 0);
    stickmanGroup.add(collarMesh);

    // Part 6 & 7: Head Sphere + Expressive Visor Band
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.86, 0);
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), stickBodyMat);
    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.18), stickVisorMat);
    visorBand.position.set(0, 0.02, 0.14);
    headGroup.add(headSphere, visorBand);
    stickmanGroup.add(headGroup);

    // Part 8 & 9: Articulated Left & Right Arms + Part 10: Laser Pointer Prop
    const armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.58, 16);
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.22, 1.52, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, stickBodyMat);
    leftArmMesh.position.set(0, -0.26, 0);
    leftArmPivot.add(leftArmMesh);
    stickmanGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.22, 1.52, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, stickBodyMat);
    rightArmMesh.position.set(0, -0.26, 0);
    const pointerBaton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.65, 12),
      stickVisorMat
    );
    pointerBaton.position.set(0.15, -0.55, 0.2);
    pointerBaton.rotation.z = -Math.PI / 3;
    rightArmPivot.add(rightArmMesh, pointerBaton);
    stickmanGroup.add(rightArmPivot);

    // 6. Composite 7-Part Procedural 3D Educational Diagram & Hologram Podium (Right-Center)
    const chartGroup = new THREE.Group();
    chartGroup.position.set(1.15, 0, -0.1);
    scene.add(chartGroup);
    chartGroup.add(createContactShadow(1.1));

    const podiumBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.3,
    });
    const podiumTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.85,
    });

    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.18, 24), podiumBaseMat);
    basePlinth.position.y = 0.09;
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.025, 12, 32), podiumTrimMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.18;
    chartGroup.add(basePlinth, baseRing);

    const barColors = [0x38bdf8, 0x22c55e, 0xf59e0b, 0xec4899];
    const barMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const barMat = new THREE.MeshStandardMaterial({
        color: barColors[i],
        roughness: 0.25,
        metalness: 0.5,
      });
      const barGeo = new THREE.BoxGeometry(0.24, 1.0, 0.24);
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(-0.52 + i * 0.35, 0.68, 0);
      chartGroup.add(bar);
      barMeshes.push(bar);
    }

    // 7. InstancedMesh (>20 repeated studio spacetime grid nodes around perimeter)
    const nodeCount = 32;
    const nodeGeo = new THREE.OctahedronGeometry(0.08, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.2,
      metalness: 0.8,
    });
    const instancedNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const rad = 3.4 + (i % 3) * 0.45;
      _dummyPos.set(Math.cos(angle) * rad, 0.35 + (i % 4) * 0.45, Math.sin(angle) * rad - 0.8);
      const s = 0.85 + (i % 3) * 0.15;
      _dummyScale.set(s, s, s);
      _dummyQuat.identity();
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      instancedNodes.setMatrixAt(i, _dummyMatrix);
      _dummyColor.setHex(i % 2 === 0 ? 0x38bdf8 : 0x818cf8);
      instancedNodes.setColorAt(i, _dummyColor);
    }
    instancedNodes.instanceMatrix.needsUpdate = true;
    if (instancedNodes.instanceColor) instancedNodes.instanceColor.needsUpdate = true;
    instancedNodes.computeBoundingSphere();
    scene.add(instancedNodes);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Software-WebGL Safe Animation Loop (afterDraw with fenceSync on software WebGL)
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const currentBeat = beatRef.current;
      const ctrl = controlsStateRef.current;

      // Apply finish mode
      if (ctrl.finishMode === 'brushed_titanium') {
        stickBodyMat.metalness = 0.85;
        stickBodyMat.roughness = 0.2;
        stickBodyMat.color.setHex(0xcbd5e1);
      } else if (ctrl.finishMode === 'cyber_gold') {
        stickBodyMat.metalness = 0.9;
        stickBodyMat.roughness = 0.18;
        stickBodyMat.color.setHex(0xfbbf24);
      } else {
        stickBodyMat.metalness = 0.2;
        stickBodyMat.roughness = 0.35;
        stickBodyMat.color.setHex(0xf8fafc);
      }

      // Exploded view damping
      const explodeOffset = ctrl.explodedRatio * 0.45;
      headGroup.position.y = THREE.MathUtils.damp(
        headGroup.position.y,
        1.86 + explodeOffset,
        6,
        dt
      );
      collarMesh.position.y = THREE.MathUtils.damp(
        collarMesh.position.y,
        1.6 + explodeOffset * 0.5,
        6,
        dt
      );

      // Animate Stickman Pose based on currentBeat.character_pose
      const wave = Math.sin(elapsed * 3.5);
      headGroup.rotation.y = wave * 0.25;
      if (currentBeat.character_pose === 'pointing' || currentBeat.character_pose === 'explaining') {
        rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 1.15 + wave * 0.15, 6, dt);
        leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -0.35, 6, dt);
      } else if (currentBeat.character_pose === 'celebrating' || currentBeat.character_pose === 'surprised') {
        rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 2.3 + wave * 0.2, 6, dt);
        leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -2.3 - wave * 0.2, 6, dt);
      } else {
        rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 0.65 + wave * 0.2, 6, dt);
        leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -0.45 - wave * 0.2, 6, dt);
      }

      // Animate 3D Data Bars height based on beat diagram_data
      const vals = currentBeat.diagram_data?.values || [45, 72, 88, 96];
      const maxV = Math.max(...vals, 1);
      barMeshes.forEach((bar, idx) => {
        const rawV = vals[idx % vals.length] || 50;
        const targetH = Math.max(0.25, (rawV / maxV) * 1.45) + Math.sin(elapsed * 2 + idx) * 0.06;
        bar.scale.y = THREE.MathUtils.damp(bar.scale.y, targetH, 5, dt);
        bar.position.y = 0.18 + bar.scale.y * 0.5 + explodeOffset * 0.4;
      });

      // Camera preset smooth exponential damping when user is not manually orbiting
      if (!ctrl.userInteracting) {
        if (ctrl.cameraPreset === 'character') {
          _targetCamPos.set(-0.9, 1.85, 2.8);
          _targetLookAt.set(-1.1, 1.45, 0.2);
        } else if (ctrl.cameraPreset === 'chart') {
          _targetCamPos.set(1.1, 1.75, 3.1);
          _targetLookAt.set(1.1, 1.0, -0.1);
        } else if (ctrl.cameraPreset === 'crane') {
          _targetCamPos.set(2.8, 3.8, 4.6);
          _targetLookAt.set(0, 1.1, 0);
        } else {
          _targetCamPos.set(0, 2.2, 5.4);
          _targetLookAt.set(0, 1.15, 0);
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 4, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 4, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 4, dt);
        _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _targetLookAt.x, 4, dt);
        _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _targetLookAt.y, 4, dt);
        _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _targetLookAt.z, 4, dt);
        controls.target.copy(_currentLookAt);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(240, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      floorTex.dispose();
      contactShadowTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      {/* Dedicated WebGL Mount Container outside React HUD overlays */}
      <div
        ref={canvasMountRef}
        data-testid="threejs-stage-canvas"
        className="w-full h-full"
      />

      {/* Minimal Top-Left Scene Spec Badge */}
      <div
        style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
        className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-200 pointer-events-none"
      >
        <span className="font-semibold text-sky-400">{beat.scene_id.toUpperCase()}</span>
        <span className="mx-1.5 text-slate-600">·</span>
        <span>3D Procedural Stickman Rig & Hologram Chart</span>
      </div>

      {/* Collapsible Unified Bottom Control Dock (Zero Viewport Occlusion, solid rgba surface) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-2xl flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          className="px-3 py-1 rounded-t-lg border border-b-0 border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show 3D Stage Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.94)' }}
            className="w-full p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            {/* Camera Presets */}
            <div className="flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {(['wide', 'character', 'chart', 'crane'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    controlsStateRef.current.userInteracting = false;
                    setCameraPreset(preset);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                    cameraPreset === preset
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Finish Swatches */}
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {(
                [
                  { id: 'studio_matte', label: 'Matte' },
                  { id: 'brushed_titanium', label: 'Titanium' },
                  { id: 'cyber_gold', label: 'Gold' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFinishMode(f.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    finishMode === f.id
                      ? 'bg-slate-200 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Exploded View Slider */}
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodedRatio}
                onChange={(e) => setExplodedRatio(parseFloat(e.target.value))}
                aria-label="Explode 3D Rig Layers"
                className="w-20 accent-sky-400 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
