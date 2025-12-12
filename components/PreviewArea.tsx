import React, { useState, useEffect } from 'react';
import { Code, Eye, Monitor, Smartphone, Tablet, Copy, Check, Layout } from 'lucide-react';
import { ViewMode, Page } from '../types';

interface PreviewAreaProps {
  pages: Page[] | null;
  isLoading: boolean;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ pages, isLoading }) => {
  const [mode, setMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [viewportWidth, setViewportWidth] = useState<'100%' | '768px' | '375px'>('100%');
  const [copied, setCopied] = useState(false);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  useEffect(() => {
    if (pages && pages.length > 0) {
      // If the active page is no longer in the list (deleted), or null, reset to first page
      if (!activePageId || !pages.find(p => p.id === activePageId)) {
        setActivePageId(pages[0].id);
      }
    }
  }, [pages, activePageId]);

  // Reset copy state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const activePage = pages?.find(p => p.id === activePageId) || pages?.[0];

  const handleCopy = () => {
    if (activePage) {
      navigator.clipboard.writeText(activePage.content);
      setCopied(true);
    }
  };

  /**
   * SAFETY NET FUNCTION
   * This ensures the preview always looks good, even if the AI returns partial code.
   */
  const processHtml = (html: string) => {
    if (!html) return "";

    let finalHtml = html;

    // 1. Fix relative image paths that break previews
    finalHtml = finalHtml.replace(/src=["'](?!\/\/|https?|data:)([^"']+)["']/g, 'src="https://placehold.co/600x400?text=Image+Missing"');

    // 2. Inject Tailwind & Fonts if the AI forgot the <head>
    if (!finalHtml.includes('<!DOCTYPE html>')) {
      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ['Inter', 'sans-serif'],
                      serif: ['Playfair Display', 'serif'],
                      mono: ['JetBrains Mono', 'monospace'],
                    }
                  }
                }
              }
            </script>
            <style>
              ::-webkit-scrollbar { width: 0px; background: transparent; }
              body { -ms-overflow-style: none; scrollbar-width: none; }
            </style>
          </head>
          <body class="min-h-screen bg-white text-black">
            ${finalHtml}
          </body>
        </html>
      `;
    }
    return finalHtml;
  };

  if (!pages && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/50 p-8">
        <Monitor className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No preview available</p>
        <p className="text-sm opacity-60">Your generated design will appear here.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="flex flex-col border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between p-3">
            <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
                onClick={() => setMode(ViewMode.PREVIEW)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === ViewMode.PREVIEW
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
                <Eye size={14} />
                Preview
            </button>
            <button
                onClick={() => setMode(ViewMode.CODE)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === ViewMode.CODE
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
                <Code size={14} />
                Code
            </button>
            </div>

            {mode === ViewMode.PREVIEW && (
            <div className="flex bg-zinc-800 rounded-lg p-1">
                <button
                onClick={() => setViewportWidth('100%')}
                className={`p-1.5 rounded-md transition-all ${
                    viewportWidth === '100%' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Desktop"
                >
                <Monitor size={14} />
                </button>
                <button
                onClick={() => setViewportWidth('768px')}
                className={`p-1.5 rounded-md transition-all ${
                    viewportWidth === '768px' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Tablet"
                >
                <Tablet size={14} />
                </button>
                <button
                onClick={() => setViewportWidth('375px')}
                className={`p-1.5 rounded-md transition-all ${
                    viewportWidth === '375px' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Mobile"
                >
                <Smartphone size={14} />
                </button>
            </div>
            )}

            {mode === ViewMode.CODE && (
            <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700"
            >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy HTML'}
            </button>
            )}
        </div>

        {/* Page Tabs */}
        {pages && pages.length > 0 && (
            <div className="flex px-3 pb-0 gap-1 overflow-x-auto">
                {pages.map((page) => (
                    <button
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            activePageId === page.id
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Layout size={12} />
                        {page.title}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950/50 backdrop-pattern">
        {activePage ? (
            mode === ViewMode.PREVIEW ? (
            <div className="w-full h-full flex justify-center bg-zinc-900/50 overflow-auto py-8">
                <div
                className="bg-white shadow-2xl transition-all duration-300 ease-in-out origin-top"
                style={{
                    width: viewportWidth,
                    height: viewportWidth === '100%' ? '100%' : 'auto',
                    minHeight: viewportWidth === '100%' ? '0' : '800px',
                    borderRadius: viewportWidth === '100%' ? '0' : '12px',
                    border: viewportWidth === '100%' ? 'none' : '1px solid #3f3f46',
                    overflow: 'hidden'
                }}
                >
                <iframe
                    srcDoc={processHtml(activePage.content)} 
                    title="Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-same-origin"
                />
                </div>
            </div>
            ) : (
            <div className="h-full overflow-auto p-4">
                <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap">
                {activePage.content}
                </pre>
            </div>
            )
        ) : (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Layout className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Select a page to view</p>
             </div>
        )}
      </div>
    </div>
  );
};

export default PreviewArea;