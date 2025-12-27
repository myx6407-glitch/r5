
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCrossPosition, getSpherePosition } from '../utils/math';

const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress; 
  
  attribute vec3 aScatterPos;
  attribute vec3 aTreePos;
  attribute float aPhase;
  attribute float aSize;
  attribute float aColorIndex; 

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float t = smoothstep(0.0, 1.0, uProgress);
    float inverseT = 1.0 - t;

    // 基础插值
    vec3 currentPos = mix(aScatterPos, aTreePos, t);

    // 强化爆发推力
    float explosion = smoothstep(0.8, 0.0, t) * smoothstep(0.0, 0.5, t) * 1200.0;
    currentPos += normalize(aScatterPos) * explosion;

    // 随机打散混沌感
    float chaos = inverseT * 250.0;
    currentPos.x += sin(uTime * 0.5 + aPhase * 2.0) * chaos;
    currentPos.y += cos(uTime * 0.4 + aPhase * 3.1) * chaos;
    currentPos.z += sin(uTime * 0.6 + aPhase * 1.5) * chaos;

    // 呼吸波动
    float breathe = sin(uTime * 1.5 + aPhase) * 15.0 * (1.1 - t);
    currentPos += normalize(currentPos) * breathe * 0.2;

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    
    // 维持“小颗粒”审美：减小基础 size，增加透视补偿
    float sizeMultiplier = mix(1.6, 1.0, t);
    gl_PointSize = (aSize * 1.3 * sizeMultiplier) * (1800.0 / -mvPosition.z);

    // 恢复明亮的颜色
    vec3 colPink = vec3(1.0, 0.45, 0.75); 
    vec3 colCyan = vec3(0.1, 0.9, 1.0); 
    vec3 colGold = vec3(1.0, 0.85, 0.2); 

    vec3 baseColor = colPink;
    if (aColorIndex > 1.5) {
        baseColor = colCyan;
    } else if (aColorIndex > 0.5) {
        baseColor = colGold;
    }

    float twinkle = sin(uTime * 4.0 + aPhase * 10.0) * 0.15;
    vColor = baseColor + vec3(twinkle);
    
    gl_Position = projectionMatrix * mvPosition;
    
    vAlpha = (0.75 + 0.25 * inverseT) * smoothstep(0.0, 0.1, uProgress * 0.5 + 0.5); 
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface FoliageProps {
  count?: number;
  progress: number;
}

export const Foliage: React.FC<FoliageProps> = ({ count = 18000, progress }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  const { positions, scatterPositions, phases, sizes, colorIndices } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scat = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const sz = new Float32Array(count);
    const ci = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const axis = Math.floor(Math.random() * 3);
      const treeP = getCrossPosition(4000, 15, 2.0, axis);
      pos[i * 3] = treeP[0];
      pos[i * 3 + 1] = treeP[1];
      pos[i * 3 + 2] = treeP[2];

      const scatP = getSpherePosition(4500);
      scat[i * 3] = scatP[0];
      scat[i * 3 + 1] = scatP[1];
      scat[i * 3 + 2] = scatP[2];

      ph[i] = Math.random() * Math.PI * 2;
      // 粒子尺寸范围 [5, 12] 维持精致感
      sz[i] = Math.random() * 7 + 5; 
      
      if (axis === 0) ci[i] = 2.0; 
      else if (axis === 1) ci[i] = 1.0; 
      else ci[i] = 0.0; 
    }

    return { positions: pos, scatterPositions: scat, phases: ph, sizes: sz, colorIndices: ci };
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.uniforms.uProgress.value,
        progress,
        0.1
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatterPos" count={scatterPositions.length / 3} array={scatterPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" count={phases.length} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aColorIndex" count={colorIndices.length} array={colorIndices} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};
