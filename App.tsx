import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import PreviewArea from './components/PreviewArea';
import { generateVibe } from './services/geminiService';
import { Message, Page } from './types';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestPages, setLatestPages] = useState<Page[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (userPrompt: string) => {
    // Optimistic UI update
    const userMessage: Message = { role: 'user', content: userPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await generateVibe(userPrompt);

      const botMessage: Message = {
        role: 'model',
        content: response.chat_response,
        type: 'code_preview',
        metadata: {
          thought_process: response.thought_process,
          pages: response.pages,
          suggestions: response.suggestions
        }
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Update the preview area with the new pages
      if (response.pages && response.pages.length > 0) {
        setLatestPages(response.pages);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to generate design. Please check your API key or try again.");
      setMessages((prev) => [...prev, { 
        role: 'model', 
        content: "I encountered an error while trying to visualize that. Could you try rephrasing?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-black text-white selection:bg-indigo-500/30">
      
      {/* Mobile Error Banner */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-red-100 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg backdrop-blur-md border border-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Left Sidebar - Chat */}
      <div className="w-full md:w-[400px] lg:w-[450px] h-[40vh] md:h-full flex-shrink-0 z-10 shadow-xl shadow-black/50">
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Right Area - Preview */}
      <div className="flex-1 h-[60vh] md:h-full relative z-0">
        <PreviewArea 
          pages={latestPages}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default App;