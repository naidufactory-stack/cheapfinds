import React, { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCcw, Crop } from 'lucide-react';

interface ImageCropperProps {
  imageFile: File;
  onCropConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, onCropConfirm, onCancel }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Helper to get coordinates for both mouse and touch events
  const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
       return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  }

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to stop page scrolling on mobile while cropping
    if (e.cancelable) e.preventDefault();
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = getClientPos(e);
    
    // Calculate relative coordinates
    const relX = x - rect.left;
    const relY = y - rect.top;

    setStartPos({ x: relX, y: relY });
    // Initialize crop box at click point with 0 size
    setCrop({ x: relX, y: relY, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    if (e.cancelable) e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = getClientPos(e);
    
    // Clamp coordinates to the image container
    const relX = Math.max(0, Math.min(x - rect.left, rect.width));
    const relY = Math.max(0, Math.min(y - rect.top, rect.height));

    // Calculate new box dimensions based on drag distance
    const width = Math.abs(relX - startPos.x);
    const height = Math.abs(relY - startPos.y);
    
    // Determine top-left corner (dragging direction agnostic)
    const newX = Math.min(relX, startPos.x);
    const newY = Math.min(relY, startPos.y);

    setCrop({ x: newX, y: newY, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
     if (!imgRef.current || !crop || crop.width < 20 || crop.height < 20) {
        // If crop is too small or non-existent, just use original
        onCropConfirm(imageFile);
        return;
     }

     const img = imgRef.current;
     // Calculate scale factor between displayed image and natural image size
     const scaleX = img.naturalWidth / img.width;
     const scaleY = img.naturalHeight / img.height;

     const canvas = document.createElement('canvas');
     canvas.width = crop.width * scaleX;
     canvas.height = crop.height * scaleY;
     const ctx = canvas.getContext('2d');

     if (ctx) {
        ctx.drawImage(
           img,
           crop.x * scaleX,
           crop.y * scaleY,
           crop.width * scaleX,
           crop.height * scaleY,
           0,
           0,
           canvas.width,
           canvas.height
        );

        canvas.toBlob((blob) => {
           if (blob) {
              const file = new File([blob], "cropped_product.jpg", { type: "image/jpeg" });
              onCropConfirm(file);
           } else {
               onCropConfirm(imageFile); // Fallback
           }
        }, 'image/jpeg', 0.95);
     }
  };

  if (!imageUrl) return null;

  return (
     <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
         <div className="w-full max-w-2xl flex flex-col h-full max-h-[90vh]">
             <div className="flex justify-between items-center mb-6 text-white shrink-0">
                 <h3 className="text-xl font-bold flex items-center gap-2">
                    <Crop size={24} className="text-cyan-400"/> 
                    <span>Crop Image</span>
                 </h3>
                 <button 
                  onClick={onCancel} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Cancel"
                 >
                    <X size={24} />
                 </button>
             </div>

             <div className="flex-1 relative overflow-hidden bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center select-none touch-none">
                 <div 
                    ref={containerRef}
                    className="relative inline-block"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                 >
                    <img 
                       ref={imgRef}
                       src={imageUrl} 
                       alt="Crop target" 
                       className="max-h-[60vh] md:max-h-[65vh] max-w-full object-contain pointer-events-none block"
                       draggable={false}
                    />
                    
                    {/* Dark Overlay with Hole (using box-shadow trick) */}
                    {crop && crop.width > 0 ? (
                        <div 
                           className="absolute border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                           style={{
                              left: crop.x,
                              top: crop.y,
                              width: crop.width,
                              height: crop.height,
                              boxSizing: 'content-box'
                           }}
                        >
                           {/* Rule of thirds grid */}
                           <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                              <div className="border-r border-cyan-200/50 col-span-1 h-full"></div>
                              <div className="border-r border-cyan-200/50 col-span-1 h-full"></div>
                              <div className="absolute w-full h-full border-b border-cyan-200/50 row-span-1 top-0 left-0" style={{ height: '33.33%' }}></div>
                              <div className="absolute w-full h-full border-b border-cyan-200/50 row-span-1 top-0 left-0" style={{ top: '33.33%', height: '33.33%' }}></div>
                           </div>
                        </div>
                    ) : (
                        // Instructional Overlay when no selection
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/60 text-white px-5 py-3 rounded-full text-sm font-medium backdrop-blur-md border border-white/10 shadow-xl">
                             Draw box to select area
                          </div>
                       </div>
                    )}
                 </div>
             </div>

             <div className="mt-6 flex flex-col md:flex-row justify-between gap-4 shrink-0">
                 <button 
                    onClick={() => onCropConfirm(imageFile)}
                    className="order-2 md:order-1 px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                 >
                    Skip Cropping
                 </button>
                 <div className="order-1 md:order-2 flex gap-3">
                    <button 
                       onClick={() => setCrop(null)}
                       className="px-4 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center"
                       title="Reset Selection"
                    >
                       <RotateCcw size={20} />
                    </button>
                    <button 
                       onClick={handleCrop}
                       className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                       <Check size={20} strokeWidth={3} />
                       Continue
                    </button>
                 </div>
             </div>
         </div>
     </div>
  );
}