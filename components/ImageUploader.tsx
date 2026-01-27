import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Plus } from 'lucide-react';

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  selectedImages: File[];
  onRemoveImage: (index: number) => void;
  allowMultiple: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImagesSelected, 
  selectedImages, 
  onRemoveImage,
  allowMultiple 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  // Update previews when files change
  useEffect(() => {
    const urls = selectedImages.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedImages]);

  // Handle paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) newFiles.push(file);
        }
      }

      if (newFiles.length > 0) {
        e.preventDefault();
        onImagesSelected(newFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onImagesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
    if (files.length > 0) {
      onImagesSelected(files);
    }
  }, [onImagesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImagesSelected(Array.from(files));
    }
  }, [onImagesSelected]);

  // If images exist, show grid view
  if (selectedImages.length > 0) {
    return (
      <div className="space-y-3 animate-in fade-in">
        <div className={`grid gap-3 ${selectedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
          {previews.map((url, idx) => (
            <div key={idx} className={`relative rounded-xl overflow-hidden border border-slate-700 group ${selectedImages.length === 1 ? 'h-64 md:h-80' : 'h-40'}`}>
              <img 
                src={url} 
                alt={`Product ${idx + 1}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button 
                  onClick={() => onRemoveImage(idx)}
                  className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
          
          {/* Add more button for multiple mode */}
          {allowMultiple && (
            <div className="relative h-40 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group">
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileInput}
              />
              <div className="p-3 bg-slate-800 rounded-full text-slate-400 group-hover:text-cyan-400 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-sm text-slate-400 font-medium">Add Image</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full h-64 md:h-80 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center p-6 cursor-pointer
        ${isDragging 
          ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]' 
          : 'border-slate-700 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-800'
        }
      `}
    >
      <input 
        type="file" 
        accept="image/*" 
        multiple={allowMultiple}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      
      <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
        {isDragging ? <Upload size={32} /> : <ImageIcon size={32} />}
      </div>
      
      <div>
        <h3 className={`text-lg font-semibold transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-300'}`}>
          {isDragging ? 'Drop images here!' : allowMultiple ? 'Upload Product Images' : 'Upload Product Image'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {allowMultiple ? 'Drag & drop multiple images' : 'Drag & drop or paste image'}
        </p>
      </div>
    </div>
  );
};