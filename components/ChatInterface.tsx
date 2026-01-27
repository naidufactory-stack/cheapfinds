import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ShoppingBag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  "Find me the cheapest iPhone 16",
  "Best running shoes under $100",
  "Compare Sony XM5 vs Bose QC45",
  "Where can I buy a PS5 today?",
  "Gift ideas for a tech lover"
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white shadow-lg shadow-emerald-500/20">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Shop with AI</h3>
          <p className="text-xs text-slate-400">Powered by Gemini 2.5</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-950/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-forwards">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Sparkles size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">How can I help you shop?</h2>
            <p className="text-slate-400 max-w-md mb-8">
              Ask me to find products, compare prices, or track down hard-to-find items.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-sm text-slate-300 text-left transition-all hover:scale-[1.02]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-cyan-600' : 'bg-slate-700'}
            `}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-emerald-400" />}
            </div>
            
            <div className={`
              max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-md
              ${msg.role === 'user' 
                ? 'bg-cyan-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}
            `}>
              {msg.role === 'user' ? (
                <p>{msg.text}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-a:text-emerald-400 prose-a:underline hover:prose-a:text-emerald-300">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-emerald-400" />
             </div>
             <div className="bg-slate-800 rounded-2xl rounded-tl-none px-5 py-4 border border-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything (e.g., 'Cheapest 4K monitor under $300')..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-5 pr-12 py-4 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};