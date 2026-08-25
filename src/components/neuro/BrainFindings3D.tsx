import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import brainAsset from "@/assets/brain-model.stl.asset.json";
import { severityColor, type ScanFinding } from "@/lib/neuro-data";

/**
 * BrainFindings3D — the patient's STL brain prototype rendered in 3D with
 * detected anomalies placed as glowing markers on/inside the brain volume.
 * Drag to orbit, scroll to zoom, click a marker to focus a finding.
 */

const TISSUE = "#DCE7F5"; // whitish-bluish brain tissue
const RIM = "#7FA8D9"; // soft clinical blue rim light

/** Map a finding's 0-100 volume coords to a point on/inside the brain's
 *  bounding ellipsoid (geometry-local units). */
function findingPosition(
  f: ScanFinding,
  center: THREE.Vector3,
  half: THREE.Vector3,
): THREE.Vector3 {
  const theta = (f.x / 100) * Math.PI * 2;
  const phi = (f.y / 100) * Math.PI;
  const dir = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );
  // z pushes the marker between the core (0.55) and the surface (1.12)
  const depth = 0.55 + (f.z / 100) * 0.57;
  return new THREE.Vector3(
    center.x + dir.x * half.x * depth,
    center.y + dir.y * half.y * depth,
    center.z + dir.z * half.z * depth,
  );
}

function FindingMarker({
  finding,
  position,
  selected,
  onSelect,
}: {
  finding: ScanFinding;
  position: THREE.Vector3;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const color = severityColor(finding.severity);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.elapsedTime;
    const pulse = 1.35 + 0.35 * Math.sin(t * 2.4 + finding.x);
    ringRef.current.scale.setScalar(selected ? pulse * 1.35 : pulse);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = selected
      ? 0.85
      : 0.4 + 0.2 * Math.sin(t * 2.4 + finding.x);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(finding.id);
  };

  return (
    <group position={position}>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[selected ? 0.075 : 0.055, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef} onClick={handleClick}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} wireframe />
      </mesh>
      {/* glow halo */}
      <mesh>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.28 : 0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function BrainModel({
  findings,
  selectedId,
  onSelect,
}: {
  findings: ScanFinding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const geometry = useLoader(STLLoader, brainAsset.url);
  const groupRef = useRef<THREE.Group>(null);

  // Normalize: center the mesh and scale it to ~3.2 units across
  const { scale, center, half } = useMemo(() => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const center = bb.getCenter(new THREE.Vector3());
    const size = bb.getSize(new THREE.Vector3());
    const half = size.clone().multiplyScalar(0.5);
    const scale = 3.2 / Math.max(size.x, size.y, size.z);
    return { scale, center, half };
  }, [geometry]);

  const scaledCenter = useMemo(
    () => new THREE.Vector3(),
    [],
  );
  const scaledHalf = useMemo(
    () => half.clone().multiplyScalar(scale),
    [half, scale],
  );

  useEffect(() => {
    geometry.computeVertexNormals();
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    // gentle pulse, same heartbeat as the hero brain
    const pulse = 1 + 0.02 * Math.sin((2 * Math.PI / 4.0) * t);
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef}>
      <group scale={scale}>
        <mesh geometry={geometry} position={center.clone().negate()}>
          <meshPhysicalMaterial
            color={TISSUE}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={0.55}
            metalness={0.1}
            clearcoat={0.4}
            emissive={RIM}
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>
      {findings.map((f) => (
        <FindingMarker
          key={f.id}
          finding={f}
          position={findingPosition(f, scaledCenter, scaledHalf)}
          selected={f.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function Controls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 2.4;
    controls.maxDistance = 9;
    controlsRef.current = controls;
    return () => controls.dispose();
  }, [camera, gl]);

  useFrame(() => controlsRef.current?.update());
  return null;
}

interface BrainFindings3DProps {
  findings: ScanFinding[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function BrainFindings3D({
  findings,
  selectedId = null,
  onSelect,
}: BrainFindings3DProps) {
  return (
    <div
      className="pixel-border-sm relative bg-dark-base/60"
      style={{ height: 420 }}
      role="img"
      aria-label="3D brain model with detected findings"
    >
      <Canvas
        camera={{ position: [0, 0.6, 4.4], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 4, 4]} intensity={20} color="#DCEBFF" />
        <pointLight position={[-4, -2, -2]} intensity={12} color={RIM} />
        <Suspense fallback={null}>
          <BrainModel
            findings={findings}
            selectedId={selectedId}
            onSelect={(id) => onSelect?.(id)}
          />
        </Suspense>
        <Controls />
      </Canvas>
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <p className="font-mono text-[11px] text-cream/40">
          drag to orbit · scroll to zoom · click a node to inspect
        </p>
      </div>
    </div>
  );
}
