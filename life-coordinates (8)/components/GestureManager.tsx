
import React, { useEffect, useRef } from 'react';
import { TreeMorphState } from '../types';

interface GestureManagerProps {
  onStateChange: (state: TreeMorphState) => void;
  active: boolean;
  handXRef: React.MutableRefObject<number>;
  isHandActiveRef: React.MutableRefObject<boolean>;
}

declare const Hands: any;
declare const Camera: any;

export const GestureManager: React.FC<GestureManagerProps> = ({ onStateChange, active, handXRef, isHandActiveRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const getDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  useEffect(() => {
    // 关键修复：即使不活跃也不要销毁，只停止逻辑。
    // 这防止了 MediaPipe Camera 在异步停止过程中因找不到 video 元素而抛出的 width/height 错误。
    if (!active) {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      isHandActiveRef.current = false;
      return;
    }

    const onResults = (results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        isHandActiveRef.current = true;
        handXRef.current = landmarks[0].x;

        const tips = [8, 12, 16, 20];
        const wrist = landmarks[0];
        const palmCenter = landmarks[9]; 
        const referenceDist = getDistance(wrist, palmCenter);

        let extendedFingers = 0;
        tips.forEach(tipIdx => {
          const dist = getDistance(landmarks[tipIdx], wrist);
          if (dist > referenceDist * 1.7) extendedFingers++;
        });

        const thumbTip = landmarks[4];
        if (getDistance(thumbTip, wrist) > referenceDist * 1.3) extendedFingers++;

        // 手势逻辑切换
        // ✋ 张开 -> 散开 (SCATTERED)
        if (extendedFingers >= 3) {
          onStateChange(TreeMorphState.SCATTERED);
        } 
        // 👊 握拳 -> 坐标轴 (TREE_SHAPE)
        else if (extendedFingers <= 1) {
          onStateChange(TreeMorphState.TREE_SHAPE);
        }
      } else {
        isHandActiveRef.current = false;
      }
    };

    // 只有在全局变量存在时才初始化
    if (typeof Hands !== 'undefined' && !handsRef.current) {
      handsRef.current = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      handsRef.current.onResults(onResults);
    }

    if (typeof Camera !== 'undefined' && videoRef.current && !cameraRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (e) {}
          }
        },
        width: 320,
        height: 240
      });
      cameraRef.current.start();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      isHandActiveRef.current = false;
    };
  }, [active, onStateChange, handXRef, isHandActiveRef]);

  // 使用 hidden 类隐藏，确保 videoRef 始终引用有效的 DOM 节点
  return (
    <div className={`pointer-events-auto flex flex-col items-end gap-3 transition-all duration-700 ${!active ? 'hidden opacity-0' : 'opacity-100'}`}>
      <div className="relative w-48 h-36 rounded-2xl overflow-hidden border border-black/10 shadow-2xl bg-white/60 backdrop-blur-xl">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover mirror grayscale contrast-125" 
          autoPlay 
          playsInline 
          muted 
        />
      </div>
      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
};
