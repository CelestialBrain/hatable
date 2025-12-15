import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import PreviewArea from './components/PreviewArea';
import { generateVibe } from './services/geminiService';
import { Message, Page } from './types';
import { AlertCircle } from 'lucide-react';

// Validation helper to ensure model output is safe and usable
const isValidPage = (page: any): page is Page => {
  return (
    typeof page === 'object' &&
    page !== null &&
    typeof page.id === 'string' &&
    !/\s/.test(page.id) && // Ensure ID has no spaces
    page.id.length > 0 &&
    typeof page.title === 'string' &&
    typeof page.content === 'string' &&
    page.content.length > 0 &&
    page.content.length < 600000 // Limit size to ~600KB to prevent memory issues
  );
};

const mergePages = (current: Page[], incoming: Page[]): Page[] => {
  const pageMap = new Map(current.map(p => [p.id, p]));
  
  incoming.forEach(page => {
    if (isValidPage(page)) {
      pageMap.set(page.id, page);
    }
  });
  
  return Array.from(pageMap.values());
};

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
      const response = await generateVibe(userPrompt, latestPages || []);
      
      const validPages = response.pages.filter(isValidPage);
      
      if (validPages.length < response.pages.length) {
        console.warn("Some generated pages were invalid and filtered out.", 
          response.pages.filter(p => !isValidPage(p)));
      }

      const updatedPages = mergePages(latestPages || [], validPages);

      const botMessage: Message = {
        role: 'model',
        content: response.chat_response,
        type: 'code_preview',
        metadata: {
          diagnostics: response.diagnostics,
          pages: updatedPages,
          suggestions: response.suggestions
        }
      };

      setMessages((prev) => [...prev, botMessage]);
      setLatestPages(updatedPages);

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

  const handleClear = () => {
    setMessages([]);
    setLatestPages(null);
    setError(null);
  };

  const handleRestoreVersion = (pages: Page[]) => {
    setLatestPages(pages);
  };

  const handleUpdatePage = (pageId: string, newContent: string) => {
    if (!latestPages) return;
    
    const updatedPages = latestPages.map(p => 
      p.id === pageId ? { ...p, content: newContent } : p
    );
    setLatestPages(updatedPages);
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
          onClear={handleClear}
          onRestore={handleRestoreVersion}
          isLoading={isLoading}
        />
      </div>

      {/* Right Area - Preview */}
      <div className="flex-1 h-[60vh] md:h-full relative z-0">
        <PreviewArea 
          pages={latestPages}
          isLoading={isLoading}
          onUpdatePage={handleUpdatePage}
        />
      </div>
    </div>
  );
};

export default App;