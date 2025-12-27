
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { DualPosition } from '../types';
import { getOffAxisPosition, getSpherePosition } from '../utils/math';

interface PhotoOrnamentsProps {
  images: string[];
  progress: number; // 0 to 1
  globalScale?: number;
  onPhotoClick: (url: string) => void;
  onDragStateChange: (isDragging: boolean) => void;
}

interface PhotoItemProps {
  url: string;
  data: DualPosition;
  progress: number;
  globalScale: number;
  onClick: (url: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ url, data, progress, globalScale, onClick, onDragStart, onDragEnd }) => {
  const texture = useTexture(url);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const { camera, raycaster, pointer } = useThree();
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const dragOffset = useMemo(() => new THREE.Vector3(), []);
  const dragStartPoint = useMemo(() => new THREE.Vector2(), []);

  // 用于实现平滑位置跟随的内部状态向量
  const currentPos = useMemo(() => new THREE.Vector3(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!meshRef.current) return;
    
    // 锁定拖动平面
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    
    const normal = new THREE.Vector3().copy(camera.position).sub(worldPos).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(normal, worldPos);
    
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      dragOffset.copy(worldPos).sub(intersection);
    }
    
    dragStartPoint.set(e.clientX, e.clientY);
    setIsDragging(true);
    onDragStart();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !meshRef.current || !meshRef.current.parent) return;
    e.stopPropagation();
    
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      const worldTarget = intersection.clone().add(dragOffset);
      const localTarget = meshRef.current.parent.worldToLocal(worldTarget);
      // 拖拽时直接修改数据中的 tree 位置，后续渲染会通过 Lerp 平滑跟随
      data.tree = [localTarget.x, localTarget.y, localTarget.z];
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    onDragEnd();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // 恢复悬停状态的光标
    document.body.style.cursor = hovered ? 'zoom-in' : 'auto';
  };

  // 显式处理双击事件，独立于拖拽逻辑
  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(url);
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime;
    // 使用 smoothstep 处理进度，让开始和结束更有弹性
    const easeProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
    const inverseEase = 1.0 - easeProgress;
    
    const { tree, scatter, phaseOffset, scale } = data;

    // 混沌值：散开时的杂乱程度
    const chaosX = Math.sin(t * 0.4 + phaseOffset) * 150.0 * inverseEase;
    const chaosY = Math.cos(t * 0.3 + phaseOffset) * 150.0 * inverseEase;
    const chaosZ = Math.sin(t * 0.5 + phaseOffset * 2.0) * 150.0 * inverseEase;

    // 计算逻辑上的目标位置
    const baseTargetX = THREE.MathUtils.lerp(scatter[0], tree[0], easeProgress) + chaosX;
    const baseTargetY = THREE.MathUtils.lerp(scatter[1], tree[1], easeProgress) + chaosY;
    const baseTargetZ = THREE.MathUtils.lerp(scatter[2], tree[2], easeProgress) + chaosZ;

    // 添加漂浮物理效果
    const floatFactor = isDragging ? 0 : 1.0;
    const floatAmp = (15.0 + (inverseEase * 60.0)) * floatFactor; 
    const floatY = Math.sin(t * 0.8 + phaseOffset) * floatAmp;
    const floatX = Math.cos(t * 0.5 + phaseOffset) * floatAmp * 0.5;

    targetPos.set(baseTargetX + floatX, baseTargetY + floatY, baseTargetZ);

    // 丝滑动画核心：使用 Lerp 实现位置的平滑过渡（归位效果）
    // 0.1 是基础插值率，结合 delta 确保在不同刷新率下表现一致
    const lerpRate = isDragging ? 0.3 : 0.08; 
    meshRef.current.position.lerp(targetPos, lerpRate);
    
    meshRef.current.lookAt(camera.position);

    // 缩放平滑过渡
    const pulse = 1.0 + Math.sin(t * 1.5 + phaseOffset) * 0.04 * easeProgress;
    const scatterShrink = 0.8 + (0.2 * easeProgress);
    const feedbackScale = (hovered || isDragging) ? 1.4 : 1.0;
    
    const targetScaleValue = scale * pulse * globalScale * feedbackScale * scatterShrink; 
    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScaleValue, 0.15);
    meshRef.current.scale.set(nextScale, nextScale, nextScale);
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        const targetOpacity = (isDragging ? 1.0 : 0.7) + (0.3 * easeProgress);
        meshRef.current.material.opacity = THREE.MathUtils.lerp(meshRef.current.material.opacity, targetOpacity, 0.1);
    }
  });

  return (
    <mesh 
      ref={meshRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onPointerOver={() => {
        setHovered(true);
        if (!isDragging) document.body.style.cursor = 'zoom-in';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (!isDragging) document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        transparent 
        roughness={0.4}
        metalness={0.1}
        color="#ffffff"
        emissive={(hovered || isDragging) ? '#ffffff' : '#000000'}
        emissiveIntensity={(hovered || isDragging) ? 0.3 : 0}
      />
      <mesh position={[0,0,-0.02]}>
         <planeGeometry args={[1.08, 1.08]} />
         <meshBasicMaterial color={(hovered || isDragging) ? "#00BBFF" : "#333333"} side={THREE.BackSide} transparent opacity={0.6} />
      </mesh>
    </mesh>
  );
};

export const PhotoOrnaments: React.FC<PhotoOrnamentsProps> = ({ images, progress, globalScale = 1.0, onPhotoClick, onDragStateChange }) => {
  const [photoData, setPhotoData] = useState<{url: string, data: DualPosition}[]>([]);

  useEffect(() => {
    setPhotoData(prev => {
      const existingUrls = prev.map(p => p.url);
      const newImages = images.filter(url => !existingUrls.includes(url));
      
      const newItems = newImages.map(url => {
        const treePosRaw = getOffAxisPosition(2200, 350);
        const scatterPosRaw = getSpherePosition(4500);
        return {
          url,
          data: {
            tree: treePosRaw,
            scatter: scatterPosRaw,
            rotationSpeed: 0,
            phaseOffset: Math.random() * Math.PI * 2,
            scale: 110,
          }
        };
      });

      const filteredPrev = prev.filter(p => images.includes(p.url));
      return [...filteredPrev, ...newItems];
    });
  }, [images]);

  return (
    <group>
      {photoData.map((item, index) => (
        <PhotoItem 
          key={`${item.url}-${index}`}
          url={item.url} 
          data={item.data} 
          progress={progress} 
          globalScale={globalScale}
          onClick={onPhotoClick}
          onDragStart={() => onDragStateChange(true)}
          onDragEnd={() => onDragStateChange(false)}
        />
      ))}
    </group>
  );
};
