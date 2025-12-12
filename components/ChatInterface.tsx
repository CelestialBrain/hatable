import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight, Dices } from 'lucide-react';
import { generateRandomIdea } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isLuckyLoading, setIsLuckyLoading] = useState(false);
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

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Vibe Architect
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Describe your UI idea, get a live prototype.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-20 px-6">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-sm">Try saying:</p>
            <p className="text-white mt-2 font-medium">"A neo-brutalist landing page for a coffee shop"</p>
            <p className="text-zinc-500 text-xs mt-2">or</p>
            <p className="text-white mt-2 font-medium">"Glassmorphism login card with pastel gradients"</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="flex flex-col gap-2 max-w-[85%]">
              <div
                className={`rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                    : 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 rounded-tl-none'
                }`}
              >
                {msg.metadata?.thought_process && (
                  <div className="mb-2 text-xs text-emerald-400/80 font-mono bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                    <span className="font-bold uppercase tracking-wider opacity-70">Design Thought:</span> {msg.metadata.thought_process}
                  </div>
                )}
                {msg.content}
              </div>

              {/* Suggestions */}
              {msg.role === 'model' && msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.metadata.suggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => onSendMessage(suggestion)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-950/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
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
             <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-600">
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
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your UI idea..."
            disabled={isLoading}
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-4 pr-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
          />
          
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {/* FEELING LUCKY BUTTON */}
            <button
              type="button"
              onClick={handleLuckyClick}
              disabled={isLoading || isLuckyLoading}
              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all disabled:opacity-50"
              title="I'm feeling lucky"
            >
              {isLuckyLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Dices size={16} />
              )}
            </button>

            {/* SEND BUTTON */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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