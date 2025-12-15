import React, { useState, useRef, useEffect } from 'react';
import { Message, Page } from '../types';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight, Dices, Wrench, Info, PlusCircle, ChevronDown, ChevronRight, LayoutTemplate, Terminal, PenTool, ShoppingBag, History, Zap } from 'lucide-react';
import { generateRandomIdea } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onClear: () => void;
  onRestore: (pages: Page[]) => void;
  isLoading: boolean;
}

const STARTER_TEMPLATES = [
  {
    icon: <LayoutTemplate className="w-5 h-5 text-purple-400" />,
    label: "SaaS Landing",
    prompt: "A modern SaaS landing page with dark mode, clear hero section, feature grid, and pricing cards. Style: Modern SaaS."
  },
  {
    icon: <Terminal className="w-5 h-5 text-emerald-400" />,
    label: "Dev Dashboard",
    prompt: "A developer dashboard showing server status, recent deployments, and API metrics. Style: Neo-Brutalism."
  },
  {
    icon: <ShoppingBag className="w-5 h-5 text-pink-400" />,
    label: "E-commerce",
    prompt: "A trendy streetwear product page with large imagery, size selector, and cart drawer. Style: Minimalist."
  },
  {
    icon: <PenTool className="w-5 h-5 text-blue-400" />,
    label: "Portfolio",
    prompt: "A creative portfolio for a visual artist with masonry gallery and smooth scroll animations. Style: Glassmorphism."
  }
];

const PROMPT_MODIFIERS = [
  "Dark Mode", "Mobile First", "Animated", "Minimal", "Chart Data", "Auth Forms"
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onClear, onRestore, isLoading }) => {
  const [input, setInput] = useState('');
  const [isLuckyLoading, setIsLuckyLoading] = useState(false);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleLuckyClick = async () => {
    if (isLuckyLoading || isLoading) return;
    
    setIsLuckyLoading(true);
    try {
      const idea = await generateRandomIdea();
      setInput(idea);
    } catch (error) {
      console.error("Failed to get lucky");
    } finally {
      setIsLuckyLoading(false);
    }
  };

  const toggleDiagnostics = (idx: number) => {
    setExpandedDiagnostics(expandedDiagnostics === idx ? null : idx);
  };

  const addModifier = (mod: string) => {
    setInput(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} + ${mod}` : mod;
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Vibe Architect
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">AI Prototype Engine</p>
        </div>
        <button 
          onClick={onClear}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="New Project"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="mt-8 px-2">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-zinc-700/50 shadow-xl shadow-black/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium mb-2">What are we building?</h3>
              <p className="text-sm text-zinc-500 max-w-[280px] mx-auto">
                Describe your dream UI or choose a starter template below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STARTER_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(t.prompt)}
                  disabled={isLoading}
                  className="p-3 bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl text-left transition-all group"
                >
                  <div className="mb-2 group-hover:scale-110 transition-transform duration-200 origin-left">
                    {t.icon}
                  </div>
                  <div className="text-sm font-medium text-zinc-300 group-hover:text-white">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="flex flex-col gap-2 max-w-[85%]">
              <div
                className={`rounded-2xl p-3 text-sm leading-relaxed shadow-md ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700'
                    : 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 rounded-tl-none'
                }`}
              >
                {/* Diagnostics Toggle */}
                {msg.metadata?.diagnostics && (
                  <div className="mb-3">
                    <button 
                      onClick={() => toggleDiagnostics(idx)}
                      className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors w-full mb-1"
                    >
                      {expandedDiagnostics === idx ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>BUILD DIAGNOSTICS</span>
                    </button>
                    
                    {expandedDiagnostics === idx && (
                      <div className="space-y-2 mt-2 animate-in slide-in-from-top-1 duration-200">
                        {msg.metadata.diagnostics.assumptions && msg.metadata.diagnostics.assumptions.length > 0 && (
                          <div className="text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                            <div className="flex items-center gap-1.5 mb-1 text-zinc-500">
                              <Info size={10} />
                              <span className="font-bold uppercase tracking-wider text-[10px]">Notes</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 opacity-80">
                              {msg.metadata.diagnostics.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        )}
                        {msg.metadata.diagnostics.repairs && msg.metadata.diagnostics.repairs.length > 0 && (
                          <div className="text-xs text-emerald-400/80 bg-emerald-950/10 p-2 rounded border border-emerald-900/20">
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-500">
                              <Wrench size={10} />
                              <span className="font-bold uppercase tracking-wider text-[10px]">Fixes</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 opacity-80">
                              {msg.metadata.diagnostics.repairs.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {msg.content}

                {/* Restore Version Button */}
                {msg.metadata?.pages && msg.metadata.pages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50">
                     <button 
                      onClick={() => msg.metadata?.pages && onRestore(msg.metadata.pages)}
                      className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                     >
                       <History size={12} />
                       Load this version
                     </button>
                  </div>
                )}
              </div>

              {/* Suggestions Chips */}
              {msg.role === 'model' && msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.metadata.suggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => onSendMessage(suggestion)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-950/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group whitespace-nowrap"
                    >
                      {suggestion}
                      <ArrowRight size={12} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-600 shadow-lg shadow-emerald-900/20">
              <Bot size={16} />
            </div>
            <div className="bg-zinc-800/50 rounded-2xl rounded-tl-none p-4 border border-zinc-700/50 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="text-zinc-400 text-sm animate-pulse">Designing your vibe...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        {/* Modifiers Bar */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {PROMPT_MODIFIERS.map((mod) => (
             <button
              key={mod}
              onClick={() => addModifier(mod)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-300 transition-all whitespace-nowrap"
            >
              <Zap size={10} className="text-yellow-500/50" />
              {mod}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your UI idea..."
            disabled={isLoading}
            className="w-full bg-black/40 border border-zinc-800 text-white rounded-xl py-3.5 pl-4 pr-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all placeholder:text-zinc-600"
          />
          
          <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleLuckyClick}
              disabled={isLoading || isLuckyLoading}
              className="h-full aspect-square flex items-center justify-center text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-50"
              title="I'm feeling lucky"
            >
              {isLuckyLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Dices size={18} />
              )}
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-full px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg shadow-indigo-900/20"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;