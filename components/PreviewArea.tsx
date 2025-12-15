import React, { useState, useEffect, useRef } from 'react';
import { Code, Eye, Monitor, Smartphone, Tablet, Copy, Check, Layout, Download, ExternalLink, RotateCw, Play } from 'lucide-react';
import { ViewMode, Page } from '../types';

interface PreviewAreaProps {
  pages: Page[] | null;
  isLoading: boolean;
  onUpdatePage?: (pageId: string, content: string) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ pages, isLoading, onUpdatePage }) => {
  const [mode, setMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [viewportWidth, setViewportWidth] = useState<'100%' | '768px' | '375px'>('100%');
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  
  // Editor state
  const [editorContent, setEditorContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  // Security token for this session
  const navTokenRef = useRef<string>(Math.random().toString(36).slice(2, 9));

  // Sync active page selection
  useEffect(() => {
    if (pages && pages.length > 0) {
      if (!activePageId || !pages.find(p => p.id === activePageId)) {
        setActivePageId(pages[0].id);
      }
    }
  }, [pages]);

  // Sync editor content when active page changes or pages update
  useEffect(() => {
    const page = pages?.find(p => p.id === activePageId);
    if (page) {
      setEditorContent(page.content);
      setIsDirty(false);
    }
  }, [activePageId, pages]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data?.type !== 'NAVIGATE_TO_PAGE') return;
      if (data?.token !== navTokenRef.current) return;

      if (data?.pageId) {
        const targetPage = pages?.find(p => p.id === data.pageId);
        if (targetPage) {
          setActivePageId(targetPage.id);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pages]);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const activePage = pages?.find(p => p.id === activePageId) || pages?.[0];

  const handleCopy = async () => {
    if (editorContent) {
      try {
        await navigator.clipboard.writeText(editorContent);
        setCopied(true);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  const handleDownload = () => {
    if (!activePage) return;
    const blob = new Blob([activePage.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenNewTab = () => {
    if (!activePage) return;
    const blob = new Blob([processHtml(activePage.content)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };
  
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setIsDirty(true);
  };

  const handleApplyChanges = () => {
    if (activePageId && onUpdatePage) {
      onUpdatePage(activePageId, editorContent);
      setIsDirty(false);
      setMode(ViewMode.PREVIEW);
      setIframeKey(prev => prev + 1);
    }
  };

  const processHtml = (html: string) => {
    if (!html) return "";
    let finalHtml = html;

    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src https://fonts.gstatic.com; img-src data: https:; connect-src https:; frame-ancestors 'none';">`;

    finalHtml = finalHtml.replace(/<img([^>]+)src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
        if (src.trim().startsWith('http') || src.trim().startsWith('data:')) return match;
        const combinedAttrs = before + after;
        const altMatch = combinedAttrs.match(/alt=["']([^"']+)["']/i);
        const altText = altMatch ? altMatch[1] : 'abstract design';
        return `<img${before}src="https://image.pollinations.ai/prompt/${encodeURIComponent(altText)}"${after}>`;
    });

    const navScript = `
      <script>
        (function() {
          const NAV_TOKEN = "${navTokenRef.current}";
          document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
              const href = link.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto') && !href.startsWith('javascript:')) {
                e.preventDefault();
                window.parent.postMessage({ type: 'NAVIGATE_TO_PAGE', pageId: href, token: NAV_TOKEN }, '*');
              }
            }
          });
        })();
      </script>
    `;

    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${navScript}</body>`);
    } else {
      finalHtml += navScript;
    }

    if (!finalHtml.includes('<!DOCTYPE html>')) {
      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${cspMetaTag}
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Playfair Display', 'serif'], mono: ['JetBrains Mono', 'monospace'] } } } }
            </script>
            <style>
              ::-webkit-scrollbar { width: 0px; background: transparent; }
              body { -ms-overflow-style: none; scrollbar-width: none; }
            </style>
          </head>
          <body class="min-h-screen bg-white text-black">${finalHtml}</body>
        </html>
      `;
    } else {
        if (finalHtml.includes('<head>')) {
            finalHtml = finalHtml.replace('<head>', `<head>${cspMetaTag}`);
        }
    }
    return finalHtml;
  };

  if (!pages && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/50 p-8">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-zinc-800">
           <Monitor className="w-10 h-10 opacity-30" />
        </div>
        <p className="text-xl font-medium text-zinc-300">Ready to visualize</p>
        <p className="text-sm opacity-50 mt-2 text-center max-w-xs">
          Select a template from the chat or describe your idea to generate a live preview.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center justify-between p-3 gap-4">
            
            {/* View Mode Toggle */}
            <div className="flex bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
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

            {/* Viewport Controls (Preview Only) */}
            {mode === ViewMode.PREVIEW && (
                <div className="hidden md:flex bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
                    <button
                        onClick={() => setViewportWidth('100%')}
                        className={`p-1.5 rounded-md transition-all ${
                            viewportWidth === '100%' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Desktop (100%)"
                    >
                        <Monitor size={14} />
                    </button>
                    <button
                        onClick={() => setViewportWidth('768px')}
                        className={`p-1.5 rounded-md transition-all ${
                            viewportWidth === '768px' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Tablet (768px)"
                    >
                        <Tablet size={14} />
                    </button>
                    <button
                        onClick={() => setViewportWidth('375px')}
                        className={`p-1.5 rounded-md transition-all ${
                            viewportWidth === '375px' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Mobile (375px)"
                    >
                        <Smartphone size={14} />
                    </button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                {mode === ViewMode.PREVIEW && (
                    <>
                        <button
                            onClick={handleRefresh}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Refresh Preview"
                        >
                            <RotateCw size={16} />
                        </button>
                        <button
                            onClick={handleOpenNewTab}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Open in New Tab"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </>
                )}

                {/* Apply Button for Code Mode */}
                {mode === ViewMode.CODE && isDirty && (
                     <button
                        onClick={handleApplyChanges}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors animate-in fade-in"
                    >
                        <Play size={14} className="fill-current" />
                        Run Changes
                    </button>
                )}
                
                <div className="w-px h-4 bg-zinc-800 mx-1"></div>

                <button
                    onClick={mode === ViewMode.CODE ? handleCopy : handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-900/20"
                >
                    {mode === ViewMode.CODE ? (
                        <>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </>
                    ) : (
                        <>
                            <Download size={14} />
                            Export
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Page Tabs */}
        {pages && pages.length > 0 && (
            <div className="flex px-3 pb-0 gap-1 overflow-x-auto border-t border-zinc-800/50">
                {pages.map((page) => (
                    <button
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            activePageId === page.id
                                ? 'border-indigo-500 text-white bg-zinc-800/30'
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
                    key={iframeKey}
                    srcDoc={processHtml(activePage.content)} 
                    title="Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-forms allow-modals"
                />
                </div>
            </div>
            ) : (
            <div className="h-full flex flex-col">
                <div className="flex-1 relative">
                    <textarea
                        value={editorContent}
                        onChange={handleEditorChange}
                        className="w-full h-full bg-zinc-950 text-zinc-300 font-mono text-xs p-6 resize-none focus:outline-none focus:bg-zinc-900/50 transition-colors leading-relaxed selection:bg-indigo-500/30"
                        spellCheck={false}
                    />
                </div>
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