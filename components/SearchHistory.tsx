import React, { useEffect, useState } from 'react';
import { Clock, AlignLeft, ArrowUpRight } from 'lucide-react';
import { SearchHistoryItem } from '../types';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
}

interface HistoryCardProps {
  item: SearchHistoryItem;
  onClick: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onClick }) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (item.images && item.images.length > 0) {
      const url = URL.createObjectURL(item.images[0]);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [item.images]);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-3 w-full bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group text-left"
    >
      <div className="h-16 w-16 shrink-0 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center relative">
        {preview ? (
          <img src={preview} alt="History thumbnail" className="h-full w-full object-cover" />
        ) : (
          <AlignLeft size={24} className="text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
          {item.description || "Image Search"}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
           <Clock size={12} className="text-slate-500" />
           <span className="text-xs text-slate-500">
             {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
        <ArrowUpRight size={16} className="text-cyan-500" />
      </div>
    </button>
  )
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-3 mb-6 border-t border-slate-800 pt-8">
        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
          <Clock size={20} />
        </div>
        <h3 className="text-lg font-bold text-white">Recent Searches</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <HistoryCard key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
    </div>
  );
};