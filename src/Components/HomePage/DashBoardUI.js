// DashBoardUI.jsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, MessageSquare, Clock, BookOpen, LayoutGrid, Settings,
  Heart, Bookmark, Mic, Sparkles, Menu, X, Video, Music, Bot,
  Moon, Sun, Image as ImageIcon, FileText, Code, Zap,
  Trash2, Loader2
} from 'lucide-react';

// routing
import { useNavigate } from 'react-router-dom';

// import local video prompt/generator tool (expects VideoPromptGenerator.jsx in same folder)
import VideoPromptGenerator from './VideoPromptGenerator';

const DashBoardUI = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [showTools, setShowTools] = useState(false);

  const navigate = useNavigate();

  // AUTH STATE (read from localStorage)
  const [user, setUser] = useState(null);

  // CHAT STATES
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi — I\'m your assistant. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // VIDEO STATES
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoMessage, setVideoMessage] = useState(null);

  // toggle for the local Video Prompt Generator tool UI
  const [showVideoTool, setShowVideoTool] = useState(false);

  // CHAT HISTORY (dynamic based on user prompts)
  const [historyItems, setHistoryItems] = useState([]);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const videoPollRef = useRef({ stopped: false, timerId: null });

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const closePanel = () => setActivePanel(null);

  // Load auth user + chat history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }

      const storedHistory = localStorage.getItem('chat_history');
      if (storedHistory) {
        try {
          setHistoryItems(JSON.parse(storedHistory));
        } catch {
          setHistoryItems([]);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
    setUser(null);
    navigate('/');
  };

  // Panel content
  const renderPanelContent = () => {
    switch (activePanel) {
      case 'history':
        return <HistoryPanel onClose={closePanel} items={historyItems} />;
      case 'library':
        return <LibraryPanel onClose={closePanel} />;
      case 'apps':
        return <AppsPanel onClose={closePanel} />;
      default:
        return null;
    }
  };

  // Auto scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      try {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages, loading, videoUrl]);

  // Helper: render message text as paragraph blocks
  const renderMessageText = (raw) => {
    if (!raw && raw !== 0) return null;
    const text = String(raw);

    const paragraphs = text.replace(/\r/g, '').split(/\n{2,}/g);

    return paragraphs.map((para, pIdx) => {
      const lines = para.split(/\n/).map(l => l.trim());
      const isAllUnordered = lines.length > 0 && lines.every(l => (/^[\*\-\u2022]\s+/.test(l)));
      const isAllOrdered = lines.length > 0 && lines.every(l => (/^\d+\.\s+/.test(l)));

      if (isAllUnordered) {
        return (
          <div key={pIdx} className="mb-4">
            {lines.map((l, i) => {
              const content = l.replace(/^[\*\-\u2022]\s+/, '').trim();
              return (
                <div key={i} className="ml-5 leading-relaxed text-sm">
                  <span className="inline-block w-4 -ml-5">•</span>
                  <span>{content}</span>
                </div>
              );
            })}
          </div>
        );
      }

      if (isAllOrdered) {
        return (
          <div key={pIdx} className="mb-4">
            {lines.map((l, i) => {
              const content = l.replace(/^\d+\.\s+/, '').trim();
              const idxLabel = l.match(/^(\d+)\./)?.[1] ?? (i + 1);
              return (
                <div key={i} className="ml-5 leading-relaxed text-sm">
                  <span className="inline-block w-6 -ml-6 text-slate-400">{idxLabel}.</span>
                  <span>{content}</span>
                </div>
              );
            })}
          </div>
        );
      }

      const parts = para.split(/\n/);
      return (
        <p key={pIdx} className="mb-4 leading-relaxed text-sm">
          {parts.map((line, idx) => (
            <span key={idx}>
              {line}
              {idx < parts.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    });
  };

  // Local-storage video lookup
  const findLocalVideoForPrompt = (prompt) => {
    if (!prompt || !window?.localStorage) return null;
    try {
      const raw = localStorage.getItem('vp_videos');
      if (!raw) return null;
      const list = JSON.parse(raw || '[]');
      if (!Array.isArray(list) || list.length === 0) return null;

      const normalizedPrompt = prompt.toLowerCase();

      for (const v of list) {
        if (!v.name) continue;
        const nameNoExt = v.name.replace(/\.[^/.]+$/, '').trim().toLowerCase();
        if (!nameNoExt) continue;
        if (normalizedPrompt.includes(nameNoExt)) return v;
      }

      for (const v of list) {
        if (!v.name) continue;
        const nameNoExt = v.name.replace(/\.[^/.]+$/, '').trim().toLowerCase();
        const nameWords = nameNoExt.split(/\s+/).filter(Boolean);
        if (nameWords.length === 0) continue;
        const matchesAll = nameWords.every(w => normalizedPrompt.includes(w));
        if (matchesAll) return v;
      }

      return null;
    } catch (err) {
      console.error('findLocalVideoForPrompt error', err);
      return null;
    }
  };

  // helper: push to history when user sends a prompt
  const addToHistory = (text) => {
    const title = text.length > 40 ? text.slice(0, 37) + '...' : text || 'New chat';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setHistoryItems(prev => {
      const updated = [{ id: Date.now(), title, time }, ...prev].slice(0, 30); // keep last 30
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_history', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // SEND CHAT MESSAGE
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    // add to history based on user search/prompt
    addToHistory(text);

    const matched = findLocalVideoForPrompt(text);
    if (matched) {
      setMessages(prev => [...prev, { role: 'user', text }]);
      const assistantMsg = {
        role: 'assistant',
        text: `Showing "${matched.name.replace(/\.[^/.]+$/, '')}" video.`,
        videoUrl: matched.dataURL
      };
      setMessages(prev => [...prev, assistantMsg]);
      setVideoUrl(matched.dataURL);
      setVideoMessage(`Loaded from local storage: ${matched.name}`);
      setInput('');
      return;
    }

    const userMsg = { role: 'user', text };

    let newMessages;
    setMessages(prev => {
      newMessages = [...prev, userMsg];
      return newMessages;
    });

    setInput('');
    setLoading(true);

    setTimeout(async () => {
      try {
        const res = await fetch("http://localhost:4000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "default",
            messages: newMessages,
          }),
        });

        if (!res.ok) {
          const err = await res.text().catch(() => null);
          console.error('Chat API responded with non-OK:', res.status, err);
          setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Server error contacting chat API." }]);
        } else {
          const data = await res.json().catch(() => ({}));
          const output = data.text || data.output || (data.raw?.text) || "No response";
          setMessages(prev => [...prev, { role: "assistant", text: output }]);
        }
      } catch (err) {
        console.error('sendMessage error:', err);
        setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Error contacting server." }]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) sendMessage();
    }
  };

  // VIDEO GENERATION (server flow)
  const generateVideo = async ({ prompt = '' } = {}) => {
    const text = (prompt || videoPrompt || '').trim();
    if (!text) return;
    setVideoGenerating(true);
    setVideoMessage("Note: Video requires FAL_KEY in server. Currently using Chat server.");
    setVideoUrl(null);
    setShowVideoModal(false);
    
    setTimeout(() => {
      setVideoGenerating(false);
      setVideoMessage("Server is currently configured for Chat (Gemini) only.");
    }, 2000);
  };

  useEffect(() => {
    return () => {
      videoPollRef.current.stopped = true;
      if (videoPollRef.current.timerId) clearTimeout(videoPollRef.current.timerId);
    };
  }, []);

  const openVideoModal = () => {
    setVideoPrompt('');
    setShowVideoModal(true);
  };

  const displayName = user?.name || "Jidan";
  const avatarSeed = user?.name || "Jidan";

  // ---------- RENDER ----------
  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
        
        {/* Custom Styles */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
            50% { transform: translateY(-15px) rotateX(10deg) rotateY(15deg); }
          }
          @keyframes spin-3d {
            from { transform: rotate3d(1, 1, 1, 0deg); }
            to { transform: rotate3d(1, 1, 1, 360deg); }
          }
          .animate-float-3d {
            animation: float 6s ease-in-out infinite;
          }
          .animate-spin-3d {
            animation: spin-3d 12s linear infinite;
          }
          aside::-webkit-scrollbar, nav::-webkit-scrollbar, .scrollbar-hide::-webkit-scrollbar { display: none; }
          aside, nav, .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 1. Primary Navigation Sidebar */}
        <aside 
          className={`
            fixed z-50 h-screen w-20 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800
            flex flex-col items-center py-6 transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 mb-8 shadow-lg shadow-blue-500/20 shrink-0 cursor-pointer"
            onClick={() => {
              setActivePanel(null);
              navigate("/dashboard");
            }}
          ></div>

          <nav className="flex-1 flex flex-col gap-6 w-full items-center overflow-y-auto scrollbar-hide">
            <SidebarIcon icon={<Plus size={20} />} label="New" onClick={() => setActivePanel(null)} />
            <SidebarIcon icon={<MessageSquare size={20} />} label="Chat" active={activePanel === null} onClick={() => setActivePanel(null)} />
            
            <div className="w-8 h-px bg-gray-100 dark:bg-slate-800 my-1"></div>
            
            <SidebarIcon icon={<Clock size={20} />} label="History" active={activePanel === 'history'} onClick={() => togglePanel('history')} />
            <SidebarIcon icon={<BookOpen size={20} />} label="Library" active={activePanel === 'library'} onClick={() => togglePanel('library')} />
            <SidebarIcon icon={<LayoutGrid size={20} />} label="Apps" active={activePanel === 'apps'} onClick={() => togglePanel('apps')} />
          </nav>

          <div className="flex flex-col gap-6 items-center mt-auto pt-4 bg-white dark:bg-slate-900 w-full shrink-0">
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-purple-500 dark:text-gray-500 dark:hover:text-yellow-400 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Settings size={20} />
            </button>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`} 
              alt="User" 
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700"
            />
          </div>
        </aside>

        {/* 2. Sliding Side Panel */}
        <div 
          className={`
            fixed md:relative left-0 md:left-auto z-40 md:z-auto h-full bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 
            transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
            ${activePanel ? 'w-80 md:w-80 translate-x-20 md:translate-x-0 ml-0 md:ml-20' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden md:ml-20'}
          `}
        >
           <div className="w-80 h-full overflow-y-auto scrollbar-hide">
              {renderPanelContent()}
           </div>
        </div>

        {/* 3. Main Content Area */}
        <main className={`flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50 dark:bg-slate-950 transition-colors duration-300 ${!isSidebarOpen ? 'ml-0' : ''}`}>
          
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`flex items-center gap-2 ${activePanel ? 'hidden md:flex' : 'flex'} cursor-pointer`}
                  onClick={() => navigate("/dashboard")}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-800 hidden sm:block">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`} alt="Profile" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white hidden sm:inline">
                    {displayName}
                  </span>
                  {user?.email && (
                    <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                      {user.email}
                    </span>
                  )}
                  {!user?.email && (
                    <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                      for Zain&apos;s Studio
                    </span>
                  )}
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Available for work
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 dark:border-slate-800 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 dark:hover:bg-slate-800 transition-all hidden sm:flex">
                <Heart size={18} />
              </button>
              <button 
                onClick={() => togglePanel('library')}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all hidden sm:flex
                  ${activePanel === 'library' 
                    ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' 
                    : 'border-gray-200 dark:border-slate-800 text-gray-400 hover:text-blue-500 hover:border-blue-100 dark:hover:bg-slate-800'}
              `}
              >
                <Bookmark size={18} />
              </button>

              {/* Login / Signup / Logout */}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 text-white px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="hidden sm:inline-flex px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-900/70 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-slate-900 text-white px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-72 scroll-smooth" ref={scrollContainerRef}>
            <div className="max-w-5xl mx-auto h-full flex flex-col pt-8 md:pt-12">

              {/* Chat Messages */}
              {messages.length > 0 && (
                <div className="w-full flex flex-col-reverse gap-4 mb-6 mt-4 border-t border-gray-200 dark:border-slate-800 pt-6 animate-in fade-in slide-in-from-top-8 duration-500">
                  <div className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Conversation Started</div>

                  {messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const bubbleClass = isUser
                      ? 'self-end bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-none'
                      : 'self-start bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none';

                    return (
                      <div
                        key={i}
                        className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-base shadow-sm leading-relaxed ${bubbleClass}`}
                      >
                        {msg.videoUrl ? (
                          <div className="flex flex-col gap-3">
                            <div className="font-medium">{msg.text}</div>
                            <video controls className="rounded-lg max-w-full">
                              <source src={msg.videoUrl} />
                              Your browser does not support HTML5 video.
                            </video>
                          </div>
                        ) : (
                          <div className="text-sm">
                            {renderMessageText(msg.text)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="self-start flex items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none animate-pulse">
                       <Loader2 size={16} className="animate-spin text-purple-500" />
                       <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}

              {/* Home / Content */}
              <HomeView />

              {/* VIDEO PREVIEW */}
              {videoUrl && (
                <div className="w-full mb-6 mt-8 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Generated Video</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{videoMessage}</div>
                  </div>
                  <video controls className="w-full rounded-lg">
                    <source src={videoUrl} />
                    Your browser does not support HTML5 video.
                  </video>
                </div>
              )}

              {/* Spacer */}
              <div className="h-40" /> 
            </div>
          </div>

          {/* ====================================================================================
              APPLE LIQUID GLASS HOVER EFFECT (Glassmorphism)
             ==================================================================================== */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="pointer-events-auto group relative flex items-end justify-center">
              
              {/* Floating Button */}
              <button
                aria-label="Open chat"
                className="
                  w-14 h-14 rounded-full 
                  bg-gradient-to-tr from-purple-600 to-pink-500 
                  text-white shadow-lg shadow-purple-500/30 
                  flex items-center justify-center 
                  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] 
                  group-hover:opacity-0 group-hover:scale-50 group-hover:translate-y-4 
                  focus:outline-none z-20
                "
                onClick={() => {
                  const ta = document.querySelector('#dashboard-chat-input');
                  if (ta) ta.focus();
                }}
              >
                <Sparkles size={24} />
              </button>

              {/* Glass Panel */}
              <div
                className={`
                  absolute bottom-0 w-[90vw] max-w-3xl
                  origin-bottom
                  transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
                  transform-gpu
                  
                  opacity-0 scale-90 translate-y-8 pointer-events-none
                  
                  group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                  focus-within:opacity-100 focus-within:scale-100 focus-within:translate-y-0 focus-within:pointer-events-auto
                  z-30
                `}
              >
                <div className="
                  bg-white/70 dark:bg-slate-900/60 
                  backdrop-blur-2xl saturate-150 
                  border border-white/20 dark:border-white/10
                  shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]
                  rounded-[2rem] 
                  p-3 flex flex-col gap-2
                ">
                  
                  {/* Text Area */}
                  <div className="flex items-center px-4 pt-3">
                    <textarea
                      id="dashboard-chat-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Ask AI anything..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 text-lg h-10 max-h-24 py-1 font-medium"
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTools(!showTools)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                          ${showTools
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                            : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'}
                        `}
                      >
                        <Plus size={18} />
                        <span>Tools</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-3 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 dark:text-slate-400 transition-colors">
                        <Mic size={20} />
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="
                          w-10 h-10 rounded-full 
                          bg-gradient-to-tr from-purple-600 to-pink-500 
                          flex items-center justify-center 
                          text-white shadow-lg shadow-purple-500/20 
                          hover:scale-105 transition-transform
                          disabled:opacity-50 disabled:hover:scale-100
                        "
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} fill="currentColor" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tools Popup */}
                {showTools && (
                  <div className="
                    absolute bottom-full left-4 mb-2 
                    bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl 
                    border border-white/20 dark:border-white/10
                    rounded-2xl shadow-xl p-2 min-w-[200px]
                    animate-in slide-in-from-bottom-2 fade-in duration-200
                  ">
                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Create</div>
                    <ToolItem icon={<ImageIcon size={18} />} label="Generate Image" />
                    <ToolItem icon={<FileText size={18} />} label="Summarize Doc" />
                    <ToolItem icon={<Code size={18} />} label="Analyze Code" />
                    <div className="h-px bg-black/5 dark:bg-white/10 my-1"></div>

                    {/* Existing server-based video modal trigger */}
                    <button
                      onClick={() => { setShowTools(false); openVideoModal(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span className="text-purple-500 dark:text-purple-400"><Video size={18} /></span>
                      <span>Generate Video (Server)</span>
                    </button>

                    {/* Local Video Prompt Generator tool */}
                    <button
                      onClick={() => { setShowTools(false); setShowVideoTool(true); }}
                      className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span className="text-pink-500 dark:text-pink-400"><Video size={18} /></span>
                      <span>Video from Local + Prompt</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Modal */}
          {showVideoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVideoModal(false)} />
              <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Generate Video</h3>
                  <button onClick={() => setShowVideoModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <X size={18} />
                  </button>
                </div>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the scene..."
                  className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 mb-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => { setShowVideoModal(false); }} className="px-4 py-2 rounded-lg hover:bg_gray-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                  <button
                    onClick={() => generateVideo({ prompt: videoPrompt })}
                    disabled={videoGenerating || !videoPrompt.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {videoGenerating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
                {videoMessage && <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">{videoMessage}</div>}
              </div>
            </div>
          )}

          {/* Local Video Prompt Generator Modal */}
          {showVideoTool && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVideoTool(false)} />
              <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-gray-200 dark:border-slate-800 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Video Prompt Tool</h3>
                  <button onClick={() => setShowVideoTool(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <X size={18} />
                  </button>
                </div>
                <VideoPromptGenerator />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

/* --- SUB COMPONENTS --- */

const HistoryPanel = ({ onClose, items = [] }) => (
  <div className="p-4 flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">History</h2>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500">
        <X size={18} />
      </button>
    </div>

    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
      {(!items || items.length === 0) && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No recent prompts yet. Start a conversation and your searches will appear here.
        </p>
      )}
      {items && items.map((it) => (
        <HistoryItem
          key={it.id}
          title={it.title}
          time={it.time}
          compact
        />
      ))}
    </div>
  </div>
);

const LibraryPanel = ({ onClose }) => (
  <div className="p-4 flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Library</h2>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500">
        <X size={18} />
      </button>
    </div>
    <div className="flex flex-col gap-3 overflow-y-auto">
      <LibraryCard type="image" title="Neon Cityscape" date="Oct 24" compact />
      <LibraryCard type="text" title="Blog Post Outline" date="Oct 23" compact />
      <LibraryCard type="code" title="Navbar Component" date="Oct 22" compact />
      <LibraryCard type="image" title="Cyberpunk Char" date="Oct 20" compact />
    </div>
  </div>
);

const AppsPanel = ({ onClose }) => (
  <div className="p-4 flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Apps</h2>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500">
        <X size={18} />
      </button>
    </div>
    <div className="flex flex-col gap-3 overflow-y-auto">
      <AppCard name="Google Drive" desc="File Access" color="bg-blue-500" compact />
      <AppCard name="Slack" desc="Notifications" color="bg-purple-500" compact />
      <AppCard name="Notion" desc="Notes Sync" color="bg-gray-800" compact />
      <AppCard name="GitHub" desc="Repo Analysis" color="bg-gray-900" compact />
      <AppCard name="Spotify" desc="Music Control" color="bg-green-500" compact />
    </div>
  </div>
);

const HomeView = () => (
  <div className="flex flex-col items-center animate-in fade-in duration-500">
    <div className="text-center mb-8 md:mb-12 relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-purple-200 dark:bg-purple-900/40 rounded-full blur-[80px] md:blur-[100px] opacity-40 pointer-events-none"></div>
      <div className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-6 relative animate-float-3d">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/30 dark:shadow-purple-900/50 animate-spin-3d"></div>
        <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/40 to-transparent backdrop-blur-sm border border-white/50 dark:border-white/20"></div>
        <div className="absolute top-4 left-4 w-6 h-3 md:w-8 md:h-4 bg-white/40 rounded-full blur-md rotate-45"></div>
      </div>
      <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 md:mb-3">
        Hi there, <span className="font-serif italic font-normal text-slate-800 dark:text-slate-200">Jidan</span>
      </h1>
      <h2 className="text-xl md:text-3xl lg:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 pb-2 leading-relaxed">
        Ready to power up your ideas?
      </h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl px-2">
      <FeatureCard icon={<Video className="text-pink-500" size={24} />} iconBg="bg-pink-50 dark:bg-pink-900/20" title="Create Cinematic 4K Videos" desc="AI-generated. Studio quality. Lightning fast." />
      <FeatureCard icon={<Music className="text-green-500" size={24} />} iconBg="bg-green-50 dark:bg-green-900/20" title="Make Music, Voiceovers & FX" desc="Compose with AI. Your sound, your style." />
      <FeatureCard icon={<Bot className="text-orange-500" size={24} />} iconBg="bg-orange-50 dark:bg-orange-900/20" title="Ask AI Assistant" desc="Get insights, automate work, brainstorm ideas." colSpan="sm:col-span-2 md:col-span-1" />
    </div>
  </div>
);

const SidebarIcon = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative group shrink-0
      ${active 
        ? 'text-slate-900 dark:text-white bg-gray-100 dark:bg-slate-800 shadow-sm' 
        : 'text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
      }
    `}
  >
    {icon}
    <span className="absolute left-14 bg-slate-800 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 md:block hidden">
      {label}
    </span>
  </button>
);

const FeatureCard = ({ icon, iconBg, title, desc, colSpan = "" }) => (
  <div className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700 transition-all cursor-pointer group flex flex-col items-start gap-4 ${colSpan}`}>
    <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <div className="text-left">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 leading-tight">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const HistoryItem = ({ title, time, compact }) => (
  <div className={`flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors ${compact ? 'p-3' : 'p-4'}`}>
    <div className="flex items-center gap-3 overflow-hidden">
      <div className={`rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
        <MessageSquare size={compact ? 16 : 18} />
      </div>
      <div className="min-w-0">
        <h4 className="font-medium text-slate-900 dark:text-white truncate text-sm">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
    {!compact && (
      <button className="text-gray-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={18} />
      </button>
    )}
  </div>
);

const LibraryCard = ({ type, title, date, compact }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer flex gap-3 items-center ${compact ? 'p-3 flex-row' : 'p-4 flex-col'}`}>
    <div className={`rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-600 shrink-0 ${compact ? 'w-12 h-12' : 'h-32 w-full'}`}>
      {type === 'image' ? <ImageIcon size={compact ? 20 : 32} /> : type === 'code' ? <Code size={compact ? 20 : 32} /> : <FileText size={compact ? 20 : 32} />}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p>
    </div>
  </div>
);

const AppCard = ({ name, desc, color, compact }) => (
  <div className={`flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all cursor-pointer ${compact ? 'p-3' : 'p-4'}`}>
    <div className={`rounded-xl ${color} flex items-center justify-center text-white shadow-lg shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
      <Zap size={compact ? 18 : 24} fill="currentColor" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{name}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>
    </div>
    {!compact && (
      <button className="px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
        Connect
      </button>
    )}
  </div>
);

const ToolItem = ({ icon, label }) => (
  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
    <span className="text-purple-500 dark:text-purple-400">{icon}</span>
    <span>{label}</span>
  </button>
);

export default DashBoardUI;
