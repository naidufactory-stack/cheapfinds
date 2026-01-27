import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, Tag, Sparkles, AlertCircle, Medal, Copy, Check, Share2, Package, TrendingUp } from 'lucide-react';
import { SearchResult } from '../types';

interface ResultsViewProps {
  result: SearchResult;
  userImage: File[] | null; // Changed to array to match new state
}

interface SourceLinkItemProps {
  link: { uri: string; title: string };
}

// Helpers to extract info from React Nodes
const extractText = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) return extractText((node.props as any).children);
  return '';
};

const extractHref = (node: any): string | null => {
   if (React.isValidElement(node)) {
      const props = node.props as any;
      if (node.type === 'a' && props.href) return props.href;
      return extractHref(props.children);
   }
   if (Array.isArray(node)) {
      for (const child of node) {
         const href = extractHref(child);
         if (href) return href;
      }
   }
   return null;
};

const SourceLinkItem: React.FC<SourceLinkItemProps> = ({ link }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  let hostname = '';
  try {
    hostname = new URL(link.uri).hostname.replace('www.', '');
  } catch (e) {
    hostname = 'Unknown Source';
  }

  return (
    <div className="flex rounded-xl border border-slate-700 bg-slate-950/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group overflow-hidden">
      <a 
        href={link.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 p-3 min-w-0"
      >
        <div className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {link.title}
        </div>
        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 group-hover:text-slate-400">
          <ExternalLink size={10} />
          {hostname}
        </div>
      </a>
      <button
        onClick={handleCopy}
        className="w-12 flex shrink-0 items-center justify-center border-l border-slate-800 group-hover:border-slate-700 text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-all"
        title="Copy Link to Clipboard"
      >
        {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
      </button>
    </div>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result, userImage }) => {
  const { text, groundingMetadata } = result;
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (userImage && userImage.length > 0) {
      const urls = userImage.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
      return () => urls.forEach(url => URL.revokeObjectURL(url));
    } else {
      setPreviewUrls([]);
    }
  }, [userImage]);
  
  // Extract web chunks for the sidebar
  const links = groundingMetadata?.groundingChunks?.filter(chunk => chunk.web).map(chunk => chunk.web!) || [];

  const handleShare = async () => {
    if (!result) return;
    try {
      const payload = {
        text: result.text,
        groundingMetadata: {
           groundingChunks: links.map(l => ({ web: l }))
        }
      };

      const json = JSON.stringify(payload);
      const encoded = btoa(encodeURIComponent(json));
      const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
      
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (e) {
      console.error("Sharing failed", e);
    }
  };

  const MarkdownComponents = {
    // Style for Multi-Product Mode (Product Headers)
    h2: ({ children, ...props }: any) => {
      return (
        <div className="mt-10 mb-6 flex items-center gap-3 border-b border-slate-700 pb-3">
          <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
            <Package size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight" {...props}>
            {children}
          </h2>
        </div>
      );
    },
    h3: ({ children, ...props }: any) => {
      const textContent = extractText(children);
      const linkUrl = extractHref(children);

      const handleCardClick = () => {
        if (linkUrl) {
           window.open(linkUrl, '_blank', 'noopener,noreferrer');
        }
      };

      // Styles for inner links to prevent double interaction, but keep visual style
      const childContainerStyle = linkUrl ? "[&_a]:pointer-events-none [&_a]:underline-offset-4" : "";
      
      // AI Price Prediction Header
      if (textContent.includes('AI Price Prediction') || textContent.includes('🔮')) {
        return (
          <div className="mt-8 mb-4 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
             <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                <TrendingUp size={24} />
             </div>
             <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200" {...props}>
               {children}
             </h3>
          </div>
        );
      }

      if (textContent.includes('🥇') || textContent.includes('Gold Choice')) {
        return (
          <div 
            onClick={handleCardClick}
            className={`mt-6 mb-4 bg-gradient-to-r from-yellow-900/20 via-yellow-800/10 to-transparent border border-yellow-700/50 rounded-xl p-5 shadow-lg relative overflow-hidden group ${linkUrl ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Medal size={80} className="text-yellow-500" />
            </div>
            <h3 className={`text-lg md:text-xl font-bold text-yellow-400 flex items-center gap-3 relative z-10 ${childContainerStyle}`} {...props}>
              {children}
              {linkUrl && <ExternalLink size={16} className="opacity-50 group-hover:opacity-100" />}
            </h3>
          </div>
        );
      }
      
      if (textContent.includes('🥈') || textContent.includes('Silver Choice')) {
        return (
          <div 
            onClick={handleCardClick}
            className={`mt-4 mb-4 bg-gradient-to-r from-slate-700/30 via-slate-600/10 to-transparent border border-slate-500/50 rounded-xl p-5 shadow-lg relative overflow-hidden group ${linkUrl ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Medal size={80} className="text-slate-400" />
            </div>
            <h3 className={`text-lg md:text-xl font-bold text-slate-300 flex items-center gap-3 relative z-10 ${childContainerStyle}`} {...props}>
              {children}
              {linkUrl && <ExternalLink size={16} className="opacity-50 group-hover:opacity-100" />}
            </h3>
          </div>
        );
      }
      
      if (textContent.includes('🥉') || textContent.includes('Bronze Choice')) {
        return (
          <div 
            onClick={handleCardClick}
            className={`mt-4 mb-4 bg-gradient-to-r from-orange-900/20 via-orange-800/10 to-transparent border border-orange-700/50 rounded-xl p-5 shadow-lg relative overflow-hidden group ${linkUrl ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Medal size={80} className="text-orange-500" />
            </div>
            <h3 className={`text-lg md:text-xl font-bold text-orange-400 flex items-center gap-3 relative z-10 ${childContainerStyle}`} {...props}>
              {children}
              {linkUrl && <ExternalLink size={16} className="opacity-50 group-hover:opacity-100" />}
            </h3>
          </div>
        );
      }

      return <h3 className="text-lg font-bold text-slate-200 mt-8 mb-4 border-b border-slate-700 pb-2" {...props}>{children}</h3>;
    },
    p: ({ children }: any) => {
      return <p className="text-slate-300 leading-relaxed mb-4">{children}</p>;
    },
    strong: ({ children }: any) => {
      return <strong className="font-semibold text-cyan-300 bg-cyan-900/30 px-1 rounded border border-cyan-800/50">{children}</strong>;
    },
    ul: ({ children }: any) => {
      return <ul className="list-disc list-inside space-y-2 text-slate-300 mb-6">{children}</ul>;
    },
    li: ({ children }: any) => {
      return <li className="ml-4">{children}</li>;
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Main Analysis Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 rounded-2xl shadow-xl shadow-black/20 border border-slate-800 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg text-white shadow-lg shadow-cyan-500/20">
                <Sparkles size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Market Analysis</h2>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all border border-slate-700 hover:border-cyan-500/30"
              title="Share Result"
            >
              {shared ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
              <span className="text-sm font-medium">{shared ? 'Copied Link' : 'Share'}</span>
            </button>
          </div>

          {/* Identified Product Images */}
          {previewUrls.length > 0 && (
            <div className="mb-8">
               <div className={`grid gap-4 ${previewUrls.length === 1 ? 'place-items-center' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-slate-950 w-full max-w-sm h-48 group">
                      <img 
                        src={url} 
                        alt={`Identified Product ${idx+1}`} 
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  ))}
               </div>
               <div className="mt-2 text-center">
                 <p className="text-xs text-slate-400 font-medium">Analysed Product(s)</p>
               </div>
            </div>
          )}
          
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown components={MarkdownComponents}>{text}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Sidebar Sources */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900 rounded-2xl shadow-xl shadow-black/20 border border-slate-800 p-6 sticky top-6">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold">
            <Tag size={18} className="text-cyan-400" />
            <h3>Source Links</h3>
          </div>

          {links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link, idx) => (
                <SourceLinkItem key={idx} link={link} />
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-950/50 rounded-xl border border-dashed border-slate-700 text-center text-slate-500 text-sm">
              <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
              <p>No direct source links provided in metadata.</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              Prices and availability are subject to change by retailers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};