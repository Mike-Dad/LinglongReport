import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, BrainCircuit, Sparkles, ChevronRight, Mic, CircleStop, PanelRight, PanelBottom, History, Trash2, MessageSquarePlus, Clock } from 'lucide-react';
import { DIMENSIONS, METRICS } from './data.js';
import { renderMarkdown, tryParseAction } from './chatUtils.js';
import ShareMenu from './ShareMenu.jsx';

const QUICK_CHIPS = [
  { label: '查看各区域销售额', message: '帮我查看各区域的销售额和毛利额' },
  { label: '分析当前报表数据', message: '请分析当前报表数据，看看有什么值得关注的发现' },
  { label: '什么是PSD指标', message: '什么是PSD指标？在零售分析中有何用途？' },
];

const WELCOME_MESSAGE = {
  role: 'agent',
  content: '您好！我是玲珑报表 AI 助手。您可以：\n\n1. **用自然语言描述查询需求**，我将自动配置报表参数\n2. **执行查询后**，让我帮您分析数据、发现趋势\n3. **自由咨询**零售 BI 相关问题\n\n请随时向我提问！',
  type: 'text',
};

const AIChatPanel = ({
  visible,
  onClose,
  layout = 'right',
  onToggleLayout,
  scenario,
  selectedDims,
  selectedMets,
  columnOrder,
  filters,
  hasGenerated,
  tableRows,
  allItemsMap,
  onUpdateScenario,
  onUpdateDims,
  onUpdateMets,
  onUpdateColumnOrder,
  onUpdateFilters,
  onSetHasGenerated,
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);
  const [panelHeight, setPanelHeight] = useState(360);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initializedRef = useRef(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const contentRefs = useRef({});

  // ── Conversation history ──
  const SESSIONS_KEY = 'linglong_chat_sessions';
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; }
    catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const currentSessionIdRef = useRef(null);

  const persistSessions = useCallback((next) => {
    const updated = typeof next === 'function' ? next(sessions) : next;
    setSessions(updated);
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)); } catch {}
  }, [sessions]);

  const saveCurrentSession = useCallback(() => {
    const realMessages = messages.filter(m => m.role === 'user' || (m.role === 'agent' && m.content));
    if (realMessages.length <= 1) return; // don't save welcome-only
    const firstUser = realMessages.find(m => m.role === 'user');
    const title = firstUser ? (firstUser.content || '').slice(0, 40) + ((firstUser.content || '').length > 40 ? '...' : '') : '新对话';
    const session = {
      id: currentSessionIdRef.current || Date.now(),
      title,
      createdAt: new Date().toISOString(),
      messages: realMessages,
    };
    currentSessionIdRef.current = session.id;
    persistSessions(prev => {
      const rest = prev.filter(s => s.id !== session.id);
      return [session, ...rest].slice(0, 50); // keep max 50
    });
  }, [messages, persistSessions]);

  const loadSession = useCallback((session) => {
    setMessages(session.messages);
    currentSessionIdRef.current = session.id;
    setShowHistory(false);
    initializedRef.current = true;
  }, []);

  const deleteSession = useCallback((id) => {
    persistSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionIdRef.current === id) {
      currentSessionIdRef.current = null;
    }
  }, [persistSessions]);

  const startNewChat = useCallback(() => {
    if (messages.length > 1) saveCurrentSession();
    setMessages([WELCOME_MESSAGE]);
    currentSessionIdRef.current = null;
    setShowHistory(false);
  }, [messages, saveCurrentSession]);

  // Auto-save on close
  const handleClose = useCallback(() => {
    if (messages.length > 1) saveCurrentSession();
    onClose();
  }, [messages, saveCurrentSession, onClose]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current) return;
      if (layout === 'bottom') {
        const delta = startYRef.current - e.clientY;
        setPanelHeight(Math.min(600, Math.max(200, startHeightRef.current + delta)));
      } else {
        const delta = startXRef.current - e.clientX;
        setPanelWidth(Math.min(800, Math.max(320, startWidthRef.current + delta)));
      }
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [layout]);

  useEffect(() => {
    if (visible && !initializedRef.current) {
      setMessages([WELCOME_MESSAGE]);
      initializedRef.current = true;
    }
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Voice input (Web Speech API) ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    setMicSupported(true);

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    return () => {
      try { recognition.abort(); } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch {
      // mic permission denied — silently fail
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  const applyQueryUpdate = (params) => {
    const nextColumnOrder = [];
    const dimIds = [];
    const metIds = [];

    if (params.dims) {
      params.dims.forEach(id => {
        const item = allItemsMap[id];
        if (item) {
          dimIds.push(id);
          nextColumnOrder.push(id);
        }
      });
    }
    if (params.mets) {
      params.mets.forEach(id => {
        const item = allItemsMap[id];
        if (item) {
          metIds.push(id);
          nextColumnOrder.push(id);
        }
      });
    }

    if (params.dims) {
      const dimItems = params.dims.map(id => allItemsMap[id]).filter(Boolean);
      onUpdateDims(dimItems);
    }
    if (params.mets) {
      const metItems = params.mets.map(id => allItemsMap[id]).filter(Boolean);
      onUpdateMets(metItems);
    }
    if (params.columnOrder && params.columnOrder.length > 0) {
      onUpdateColumnOrder(params.columnOrder);
    } else if (nextColumnOrder.length > 0) {
      onUpdateColumnOrder(nextColumnOrder);
    }
    if (params.scenario) {
      onUpdateScenario(params.scenario);
    }
    if (params.filters) {
      const newFilters = {};
      Object.entries(params.filters).forEach(([id, rule]) => {
        newFilters[id] = {
          rule: rule.rule || 'in',
          values: rule.values || [],
          text: rule.text || (rule.values || []).join(', '),
        };
      });
      onUpdateFilters(newFilters);
    }
    // Mark data needs regeneration
    onSetHasGenerated(false);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed, type: 'text' }]);
    setInput('');
    setLoading(true);

    const streamMsgId = Date.now();
    setMessages(prev => [...prev, { role: 'agent', content: '', type: 'text', id: streamMsgId, streaming: true }]);

    const context = {
      scenario,
      dims: selectedDims.map(d => ({ id: d.id, name: d.name, category: d.category })),
      mets: selectedMets.map(m => ({ id: m.id, name: m.name, category: m.category })),
      columnOrder,
      filters,
      hasGenerated,
      dataPreview: hasGenerated ? tableRows.slice(0, 5) : [],
    };

    try {
      const res = await fetch('/api/bi-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            // Try to parse action from every chunk — tool responses arrive as
            // independent chunks via the message queue, not only on the last event.
            const parsed = tryParseAction(data.text);
            if (parsed?.action === 'update_query') {
              applyQueryUpdate(parsed.params);
              setMessages(prev => prev.map(msg =>
                msg.id === streamMsgId
                  ? { ...msg, content: parsed.params.explanation || '查询配置已更新', type: 'action', actionParams: parsed.params, streaming: !data.last }
                  : msg
              ));
            } else {
              setMessages(prev => prev.map(msg =>
                msg.id === streamMsgId && msg.type !== 'action'
                  ? { ...msg, content: data.text || '', streaming: !data.last }
                  : msg
              ));
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === streamMsgId
          ? { ...msg, content: '抱歉，无法连接到 AI 服务。请确认后端已启动（`python linglong_ai.py`）。', type: 'text', isError: true, streaming: false }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleChipClick = (message) => {
    sendMessage(message);
  };

  return (
    <div
      style={layout === 'bottom'
        ? { height: visible ? panelHeight : 0 }
        : { width: visible ? panelWidth : 0 }
      }
      className={`shrink-0 overflow-hidden transition-[width,height] duration-300 ease-in-out bg-white flex min-w-0 min-h-0 ${
        layout === 'bottom'
          ? 'flex-col border-t border-slate-200 rounded-t-2xl'
          : 'flex-row border-l border-slate-200'
      } ${visible ? 'shadow-2xl shadow-slate-300/50' : ''}`}
    >
      {/* Drag handle — part of flex flow, not absolute */}
      {layout === 'bottom' ? (
        <div
          className="shrink-0 h-1.5 cursor-row-resize group flex items-center justify-center hover:bg-indigo-200 transition-colors bg-slate-100"
          onMouseDown={(e) => {
            draggingRef.current = true;
            startYRef.current = e.clientY;
            startHeightRef.current = panelHeight;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="h-0.5 w-8 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
        </div>
      ) : (
        <div
          className="shrink-0 w-1.5 cursor-col-resize group flex items-center justify-center hover:bg-indigo-200 transition-colors bg-slate-100"
          onMouseDown={(e) => {
            draggingRef.current = true;
            startXRef.current = e.clientX;
            startWidthRef.current = panelWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="w-0.5 h-8 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
        </div>
      )}

      {/* Inner wrapper — fixed size to prevent content reflow during animation */}
      <div
        style={layout === 'bottom' ? { height: panelHeight } : { width: panelWidth }}
        className="flex flex-col flex-1 min-w-0 min-h-0"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">AI 助手</h2>
              <p className="text-[10px] text-slate-400 font-medium">玲珑报表智能分析</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={startNewChat}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              title="新对话"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                showHistory ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
              title="历史对话"
            >
              <History className="w-4 h-4" />
            </button>
            {onToggleLayout && (
              <button
                onClick={onToggleLayout}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                title={layout === 'bottom' ? '切换至侧边栏' : '切换至底部面板'}
              >
                {layout === 'bottom' ? <PanelRight className="w-4 h-4" /> : <PanelBottom className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 历史对话
              </span>
              <span className="text-[10px] text-slate-400">{sessions.length} 条记录</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-8">暂无历史对话</div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="group bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex items-start gap-2.5"
                    onClick={() => loadSession(s)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700 truncate">{s.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{new Date(s.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{s.messages.length} 条消息</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="shrink-0 w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {!showHistory && (<>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
          {messages.map((msg, idx) => {
            if (msg.role === 'user') {
              return (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[85%] bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              );
            }

            if (msg.type === 'action') {
              return (
                <div key={idx} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="max-w-[85%] bg-white border border-emerald-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">查询配置已更新</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{msg.content}</p>
                    {msg.actionParams && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.actionParams.dims && msg.actionParams.dims.map(id => {
                          const item = allItemsMap[id];
                          return item ? (
                            <span key={id} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium">
                              {item.name}
                            </span>
                          ) : null;
                        })}
                        {msg.actionParams.mets && msg.actionParams.mets.map(id => {
                          const item = allItemsMap[id];
                          return item ? (
                            <span key={id} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium">
                              {item.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Agent text
            return (
              <div key={idx} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <BrainCircuit className="w-4 h-4 text-indigo-500" />
                </div>
                <div className={`flex-1 rounded-2xl rounded-tl-none px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.isError
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}>
                  <div
                    className={msg.isError ? '' : 'prose-slate'}
                    ref={msg.isError ? undefined : (el) => { contentRefs.current[idx] = el; }}
                    dangerouslySetInnerHTML={msg.isError ? undefined : { __html: renderMarkdown(msg.content) }}
                  >
                    {msg.isError ? msg.content : undefined}
                  </div>
                  {!msg.isError && !msg.streaming && (
                    <div className="flex justify-end mt-2">
                      <ShareMenu markdownText={msg.content} contentRef={() => contentRefs.current[idx]} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading indicator — only shown when no streaming message yet */}
          {loading && !messages.some(m => m.streaming) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips (only when no messages beyond welcome) */}
        {messages.length <= 1 && messages[0]?.type === 'text' && !loading && (
          <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip.message)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                {chip.label}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '正在聆听...' : '输入您的问题...'}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-slate-50"
              disabled={loading}
            />
            {/* Mic button — shown when supported */}
            {micSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
                title={isListening ? '停止录音' : '语音输入'}
              >
                {isListening ? <CircleStop className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Enter 发送 · Shift+Enter 换行
            {micSupported && ' · 🎤 语音输入'}
          </p>
        </div>
        </>)}
      </div>
    </div>
  );
};

export default AIChatPanel;
