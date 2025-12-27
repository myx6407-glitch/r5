
import React, { useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { PhotoOrnaments } from './PhotoOrnaments';
import { GoldDust } from './GoldDust';
import { TreeMorphState } from '../types';

interface SceneProps {
  treeState: TreeMorphState;
  userImages: string[];
  photoScale?: number;
  onPhotoClick: (url: string) => void;
  handXRef: React.MutableRefObject<number>;
  isHandActiveRef: React.MutableRefObject<boolean>;
  isDraggingPhoto: boolean;
  setIsDraggingPhoto: (dragging: boolean) => void;
}

export const Scene: React.FC<SceneProps> = ({ 
  treeState, 
  userImages, 
  photoScale = 1.5, 
  onPhotoClick,
  handXRef,
  isHandActiveRef,
  isDraggingPhoto,
  setIsDraggingPhoto
}) => {
  const progressRef = useRef(0);
  const targetProgress = treeState === TreeMorphState.TREE_SHAPE ? 1 : 0;
  
  const groupRef = useRef<THREE.Group>(null);
  const angularVelocity = useRef(0.15); 
  const lastMouseX = useRef(0);
  const isDraggingScene = useRef(false);
  const lastHandX = useRef(0.5);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDraggingPhoto) return;
    isDraggingScene.current = true;
    lastMouseX.current = e.clientX;
    angularVelocity.current = 0; 
    e.stopPropagation(); 
  };

  const handlePointerUp = () => {
    isDraggingScene.current = false;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isDraggingScene.current && groupRef.current && !isDraggingPhoto) {
        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;
        groupRef.current.rotation.y += deltaX * 0.005;
        angularVelocity.current = deltaX * 0.05; 
    }
  };

  useFrame((state, delta) => {
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress, Math.min(delta * 3.5, 1.0));
    
    if (groupRef.current) {
        if (isDraggingPhoto) {
            angularVelocity.current = 0;
            return;
        }

        const friction = 0.96;
        
        if (!isDraggingScene.current && isHandActiveRef.current) {
            const currentHandX = handXRef.current;
            const handDelta = currentHandX - lastHandX.current;
            angularVelocity.current += handDelta * 18.0; 
            lastHandX.current = currentHandX;
        }

        angularVelocity.current *= friction;
        
        const idleSpeed = 0.06;
        if (!isDraggingScene.current && !isHandActiveRef.current) {
             if (Math.abs(angularVelocity.current) < idleSpeed) {
                  angularVelocity.current = THREE.MathUtils.lerp(angularVelocity.current, idleSpeed, 0.05);
             }
        }
        
        groupRef.current.rotation.y += angularVelocity.current * delta;
    }
  });

  const hasPhotos = userImages.length > 0;

  return (
    <>
      <color attach="background" args={['#ffffff']} />
      
      <PerspectiveCamera makeDefault position={[0, 400, 3200]} fov={45} far={20000} />
      
      <OrbitControls 
        enabled={!isDraggingPhoto && !isHandActiveRef.current} 
        enablePan={false} 
        enableRotate={true}
        enableZoom={true}
        target={[0, 0, 0]} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.6}
        minDistance={800} 
        maxDistance={12000}
        makeDefault
      />

      <mesh 
        position={[0, 0, 0]} 
        visible={false} 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[30000, 30000]} />
      </mesh>

      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight position={[1000, 2000, 1000]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-1000, -500, -1000]} intensity={0.4} color="#0088ff" />

      <Environment resolution={256}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Lightformer form="rect" intensity={2} position={[0, 0, 10]} scale={[10, 10, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        </group>
      </Environment>

      <group ref={groupRef} position={[0, 0, 0]}>
        <Foliage 
          count={18000} 
          progress={progressRef.current} 
        />
        <GoldDust />
        {hasPhotos && (
           <PhotoOrnaments 
             images={userImages} 
             progress={progressRef.current}
             globalScale={photoScale}
             onPhotoClick={onPhotoClick}
             onDragStateChange={setIsDraggingPhoto}
           />
        )}
      </group>

      <EffectComposer disableNormalPass multisampling={4}>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.5} radius={0.4} />
        <Vignette eskil={false} offset={0.05} darkness={0.15} />
      </EffectComposer>
    </>
  );
};
