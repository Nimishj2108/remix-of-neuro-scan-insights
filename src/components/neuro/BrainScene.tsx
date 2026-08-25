import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * BrainScene — interactive 3D brain with zoom-to-dive.
 *
 * exterior: translucent coral brain pulsing & rotating behind page content.
 * diving:   camera flies into the neural web (triggered by parent phase).
 * interior: immersive neuron field drifting around the viewer.
 */

const PULSE_PERIOD = 4.0;
const PULSE_AMP = 0.03;
const CORAL = "#F48BA0";
const CORAL_DIM = "#D97085";
const NEON = "#E8506A";

export type BrainPhase = "exterior" | "diving" | "interior" | "surfacing";

interface BrainSceneProps {
  phase: BrainPhase;
  onPhaseChange?: (phase: BrainPhase) => void;
  decorative?: boolean;
  decorativeScale?: number;
}

function createHemisphereGeometry(side: "left" | "right"): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 48, 36);
  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    // Hemisphere: wider than tall, longer front-to-back
    v.x *= 0.62;
    v.y *= 0.72;
    v.z *= 0.9;

    // Flatten the medial (inner) wall
    const innerDir = side === "right" ? -1 : 1;
    const medialX = v.x * innerDir;
    if (medialX < 0) {
      v.x += innerDir * Math.abs(medialX) * 0.45;
    }

    // Taper toward the brainstem (bottom rear)
    if (v.y < -0.3) {
      const t = (-v.y - 0.3) / 0.42;
      const squeeze = 1 - 0.35 * Math.min(t, 1) ** 2;
      v.x *= squeeze;
      v.z *= squeeze;
    }

    // Cortical folds — layered sine noise
    const n =
      Math.sin(v.x * 7.1 + v.y * 5.7) *
        Math.cos(v.z * 6.3 + v.x * 3.1) *
        0.022 +
      Math.sin(v.y * 11.3 + v.z * 8.9) * 0.012;
    v.x += n * 0.62;
    v.y += n * 0.72;
    v.z += n * 0.9;

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

function Hemisphere({
  side,
  position,
  phaseOffset,
}: {
  side: "left" | "right";
  position: [number, number, number];
  phaseOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => createHemisphereGeometry(side), [side]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, 24), [geometry]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const pulse =
      1 + PULSE_AMP * Math.sin((2 * Math.PI / PULSE_PERIOD) * t + phaseOffset);
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={CORAL}
          transparent
          opacity={0.26}
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.6}
          metalness={0.15}
          clearcoat={0.4}
          emissive={NEON}
          emissiveIntensity={0.15}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={NEON} transparent opacity={0.3} />
      </lineSegments>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={CORAL}
          transparent
          opacity={0.5}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Synapse sparks — glowing points floating inside the skull volume */
function SynapseField({ count = 260 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(CORAL_DIM);
    const c2 = new THREE.Color(NEON);
    for (let i = 0; i < count; i++) {
      // Sample inside an ellipsoid (brain volume)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.5;
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
      positions[i * 3 + 2] = r * Math.cos(phi) * 1.1;
      const c = Math.random() > 0.5 ? c1 : c2;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.05;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = 0.035 + 0.012 * Math.sin(clock.elapsedTime * 2.2);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.04}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Interior neuron field — visible when the camera is inside */
function InteriorNeurons({ count = 420 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, linePositions } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 6;
      pts.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
      );
    }
    const positions = new Float32Array(count * 3);
    pts.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    // Sparse wiring between neighbours
    const lines: number[] = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (pts[i]!.distanceTo(pts[j]!) < 1.6 && Math.random() < 0.25) {
          lines.push(pts[i]!.x, pts[i]!.y, pts[i]!.z, pts[j]!.x, pts[j]!.y, pts[j]!.z);
        }
      }
    }
    return { positions, linePositions: new Float32Array(lines) };
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.06;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.1) * 0.15;
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={CORAL}
          size={0.05}
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={NEON} transparent opacity={0.18} />
      </lineSegments>
    </group>
  );
}

function CameraRig({ phase }: { phase: BrainPhase }) {
  const progressRef = useRef(0);

  useFrame(({ camera }, delta) => {
    const target = phase === "diving" || phase === "interior" ? 1 : 0;
    const speed = phase === "diving" ? 0.55 : 0.9;
    progressRef.current = THREE.MathUtils.damp(
      progressRef.current,
      target,
      speed * 3,
      delta,
    );
    const p = progressRef.current;
    camera.position.z = THREE.MathUtils.lerp(4.6, 0.2, p);
    camera.position.y = THREE.MathUtils.lerp(0.15, 0, p);
  });

  return null;
}

function BrainGroup({
  phase,
  decorative,
  decorativeScale,
}: {
  phase: BrainPhase;
  decorative: boolean;
  decorativeScale: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.22;
    groupRef.current.rotation.x = Math.sin((t / 10) * Math.PI * 2) * 0.06;
    groupRef.current.visible = phase !== "interior";
  });

  const scale = decorative ? decorativeScale : 2.2;

  return (
    <group ref={groupRef} scale={scale} position={[0, -0.1, 0]}>
      <Hemisphere side="left" position={[-0.34, 0.05, 0]} phaseOffset={0} />
      <Hemisphere side="right" position={[0.34, 0.05, 0]} phaseOffset={0.4} />
      {/* Brainstem */}
      <mesh position={[0, -0.62, -0.15]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.07, 0.55, 16]} />
        <meshPhysicalMaterial
          color={CORAL}
          transparent
          opacity={0.3}
          emissive={NEON}
          emissiveIntensity={0.2}
          depthWrite={false}
        />
      </mesh>
      <SynapseField />
    </group>
  );
}

export default function BrainScene({
  phase,
  onPhaseChange,
  decorative = false,
  decorativeScale = 1.0,
}: BrainSceneProps) {
  // ESC / click surfaces from interior
  const handleClick = () => {
    if (phase === "interior") onPhaseChange?.("surfacing");
  };

  return (
    <div
      className="absolute inset-0"
      onClick={handleClick}
      role="presentation"
    >
      <Canvas
        camera={{ position: [0, 0.15, 4.6], fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={20} color="#ffd9e0" />
        <pointLight position={[-4, -2, -2]} intensity={12} color={NEON} />
        <CameraRig phase={phase} />
        {!decorative && phase !== "interior" && (
          <BrainGroup
            phase={phase}
            decorative={decorative}
            decorativeScale={decorativeScale}
          />
        )}
        {decorative && (
          <BrainGroup
            phase="exterior"
            decorative={decorative}
            decorativeScale={decorativeScale}
          />
        )}
        {!decorative && (phase === "interior" || phase === "diving") && (
          <InteriorNeurons />
        )}
      </Canvas>
      {phase === "interior" && (
        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
          <p className="font-mono text-sm text-cream/40 animate-pulse-slow">
            inside the neural web · click or press ESC to surface
          </p>
        </div>
      )}
    </div>
  );
}
