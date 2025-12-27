
import React, { useState, Suspense, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/Scene';
import { TreeMorphState } from './types';
import { GestureManager } from './components/GestureManager';

const Logo: React.FC = () => (
  <div className="flex items-center select-none pointer-events-auto transition-all duration-500">
    <div className="relative">
      <img 
        src="https://file.uhsea.com/2512/c6ecfe403a3e29fa1d2afc9c8ead0238ZV.png" 
        alt="人生坐标" 
        className="h-20 md:h-28 w-auto object-contain filter"
      />
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.TREE_SHAPE);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [photoScale, setPhotoScale] = useState<number>(1.5);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState<boolean>(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handXRef = useRef<number>(0.5);
  const isHandActiveRef = useRef<boolean>(false);

  const startExperience = () => {
    setIsFading(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1200);
  };

  const returnToSplash = () => {
    setIsFading(false);
    setShowSplash(true);
  };

  const toggleState = useCallback(() => {
    setTreeState(prev => 
      prev === TreeMorphState.TREE_SHAPE 
        ? TreeMorphState.SCATTERED 
        : TreeMorphState.TREE_SHAPE
    );
  }, []);

  const handleGestureStateChange = useCallback((newState: TreeMorphState) => {
    setTreeState(newState);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newImages.push(e.target.result as string);
          if (newImages.length === files.length) {
            setUserImages(prev => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoClick = (url: string) => {
    setViewingImage(url);
  };

  const closeViewer = () => {
    setViewingImage(null);
  };

  const handleDeletePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewingImage && window.confirm("确定要永久删除这段记忆吗？")) {
      setUserImages(prev => prev.filter(img => img !== viewingImage));
      setViewingImage(null);
    }
  };

  const clearAllPhotos = () => {
    if (window.confirm("确定要清空所有记忆吗？")) {
        setUserImages([]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-white text-black overflow-hidden font-['Montserrat']">
      {/* UI Layers */}
      <div className={`absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4 items-start pointer-events-auto">
            <Logo />
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={returnToSplash}
                className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-md border border-black/5 rounded-full hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all duration-500 group shadow-sm"
                title="返回欢迎页"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>

              <button 
                onClick={triggerFileUpload}
                className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-md border border-black/5 rounded-full hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all duration-500 group shadow-sm"
                title="上传记忆"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="flex flex-col gap-4 items-end pointer-events-auto">
            <button 
              onClick={() => setIsGestureEnabled(!isGestureEnabled)}
              className={`px-4 py-2 rounded-full border border-black/10 transition-colors shadow-sm text-xs font-bold tracking-widest uppercase ${isGestureEnabled ? 'bg-cyan-500 text-white border-cyan-500 shadow-cyan-500/20' : 'bg-white/80 backdrop-blur-md text-black hover:bg-black/5'}`}
            >
              {isGestureEnabled ? '手势感应：开启 / GESTURE ON' : '手势感应：关闭 / GESTURE OFF'}
            </button>
            <GestureManager 
              active={isGestureEnabled} 
              onStateChange={handleGestureStateChange}
              handXRef={handXRef}
              isHandActiveRef={isHandActiveRef}
            />
          </div>
        </div>

        <div className="flex justify-between items-end pointer-events-auto">
          <div className="flex gap-4">
            <button 
              onClick={toggleState}
              className={`px-8 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-black tracking-[0.3em] uppercase border-2 ${treeState === TreeMorphState.TREE_SHAPE ? 'bg-cyan-500 text-white border-cyan-500 shadow-cyan-500/20' : 'bg-pink-500 text-white border-pink-500 shadow-pink-500/20'}`}
            >
              {treeState === TreeMorphState.TREE_SHAPE ? '坐标轴形态/ AXIS' : '散开形态/ SCATTER'}
            </button>
          </div>
          {userImages.length > 0 && (
            <button 
              onClick={clearAllPhotos}
              className="px-4 py-2 text-[9px] font-bold text-black/30 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
            >
              清空所有照片 / RESET GALLERY
            </button>
          )}
        </div>
      </div>

      <div className={`absolute inset-0 z-0 transition-opacity duration-[2000ms] ${showSplash ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
        <Suspense fallback={null}>
          <Canvas shadows>
            <Scene 
              treeState={treeState}
              userImages={userImages}
              photoScale={photoScale}
              onPhotoClick={handlePhotoClick}
              handXRef={handXRef}
              isHandActiveRef={isHandActiveRef}
              isDraggingPhoto={isDraggingPhoto}
              setIsDraggingPhoto={setIsDraggingPhoto}
            />
          </Canvas>
          <Loader />
        </Suspense>
      </div>

      {viewingImage && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-3xl p-10 cursor-zoom-out animate-in fade-in duration-700"
          onClick={closeViewer}
        >
          <div className="relative max-w-full max-h-full shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden bg-white border border-black/5" onClick={e => e.stopPropagation()}>
            <img src={viewingImage} alt="Viewing" className="max-w-[80vw] max-h-[80vh] object-contain" />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white to-transparent flex justify-between items-center">
                <button 
                    onClick={handleDeletePhoto}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all text-[10px] font-black tracking-widest uppercase"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    永久删除 / DELETE
                </button>
                <button 
                    onClick={closeViewer}
                    className="px-8 py-3 bg-black text-white rounded-full hover:bg-black/80 transition-all text-[10px] font-black tracking-widest uppercase"
                >
                    关闭预览 / CLOSE
                </button>
            </div>
          </div>
        </div>
      )}

      {showSplash && (
        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-all duration-[1200ms] ${isFading ? 'opacity-0 scale-110 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
          <div className="flex flex-col items-center max-w-xl text-center gap-16 px-12">
            <div className="scale-[1.8] mb-8 animate-in fade-in zoom-in duration-1000">
              <Logo />
            </div>
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
              <h2 className="text-sm font-black tracking-[0.5em] uppercase text-black/90">
                探索你的人生坐标
              </h2>
              <p className="text-[11px] leading-loose text-black/40 font-medium tracking-[0.2em] px-4 max-w-sm mx-auto">
                将你的珍贵瞬间上传，它们将化作星辰<br/>
                在三维空间中寻找属于自己的位置
              </p>
            </div>
            <button 
              onClick={startExperience}
              className="group relative px-16 py-6 overflow-hidden rounded-full transition-all hover:scale-110 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500"
            >
              <div className="absolute inset-0 bg-black transition-transform duration-500 group-hover:scale-105"></div>
              <span className="relative text-white text-[11px] font-black tracking-[0.6em] uppercase">
                开始探索 / ENTER
              </span>
            </button>
          </div>
          <div className="absolute bottom-16 flex flex-col items-center gap-2 opacity-20">
             <div className="w-[1px] h-12 bg-black animate-bounce"></div>
             <span className="text-[8px] font-bold tracking-[0.4em] uppercase">
                Gesture & Motion Control Enabled
             </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
