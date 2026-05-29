import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Plus, ChevronDown, Calendar, Search, Play,
  Filter, CheckSquare, Square, Tag, Trash2, Database,
  Download, Layout, Gem, BrainCircuit, Send, Sparkles, Mic, CircleStop
} from 'lucide-react';
import { DIMENSIONS, METRICS, SCENARIOS, DIM_DICT } from './data.js';
import { renderMarkdown, tryParseAction } from './chatUtils.js';
import ShareMenu from './ShareMenu.jsx';

const AppMobile = () => {
  const [scenario, setScenario] = useState('query');
  const [selectedDims, setSelectedDims] = useState([]);
  const [selectedMets, setSelectedMets] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  // 用户
  const [currentUser, setCurrentUser] = useState('管理员');
  const userList = ['管理员', '张三', '李四', '王五'];
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 报表存储
  const REPORTS_KEY = 'linglong_saved_reports';
  const [savedReports, setSavedReports] = useState(() => {
    try { const raw = localStorage.getItem(REPORTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const persistReports = (reports) => {
    setSavedReports(prev => {
      const next = typeof reports === 'function' ? reports(prev) : reports;
      try { localStorage.setItem(REPORTS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  };
  const myReports = useMemo(() => savedReports.filter(r => r.owner === currentUser), [savedReports, currentUser]);
  const myOwnReports = useMemo(() => myReports.filter(r => r.creator === currentUser), [myReports, currentUser]);
  const [selectedSavedReportId, setSelectedSavedReportId] = useState(null);
  const selectedSavedReport = useMemo(() => myReports.find(r => r.id === selectedSavedReportId) || null, [myReports, selectedSavedReportId]);
  const [saveReportName, setSaveReportName] = useState('');
  const [saveReportRemark, setSaveReportRemark] = useState('');
  const [showSaveReportModal, setShowSaveReportModal] = useState(false);
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);

  // AI 助手
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const messagesEndRef = useRef(null);
  const aiInputRef = useRef(null);
  const aiInitializedRef = useRef(false);
  const contentRefs = useRef({});

  const openSaveReportModal = () => {
    setSaveReportName('');
    setSaveReportRemark('');
    setSelectedSavedReportId(myOwnReports.length > 0 ? myOwnReports[0].id : null);
    setShowSaveReportModal(true);
  };

  const saveReport = () => {
    const name = saveReportName.trim();
    const remark = saveReportRemark.trim();
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    if (name) {
      const report = {
        id: `report-${Date.now()}`,
        name,
        creator: currentUser,
        owner: currentUser,
        createdAt: now,
        updatedAt: now,
        remark,
        columnOrder: [...columnOrder],
      };
      persistReports(prev => [...prev, report]);
      setSelectedSavedReportId(report.id);
    } else if (selectedSavedReportId) {
      persistReports(prev => prev.map(r => r.id === selectedSavedReportId ? {
        ...r,
        updatedAt: now,
        remark: remark || r.remark,
        columnOrder: [...columnOrder],
      } : r));
    } else {
      return;
    }
    setShowSaveReportModal(false);
    setSaveReportName('');
    setSaveReportRemark('');
  };

  const openMyReportsModal = () => {
    setSelectedSavedReportId(myReports.length > 0 ? myReports[0].id : null);
    setShowMyReportsModal(true);
  };

  const deleteSavedReport = () => {
    if (!selectedSavedReportId) return;
    persistReports(prev => prev.filter(r => r.id !== selectedSavedReportId));
    const remaining = myReports.filter(r => r.id !== selectedSavedReportId);
    setSelectedSavedReportId(remaining.length > 0 ? remaining[0].id : null);
  };

  const loadSavedReport = () => {
    const report = savedReports.find(r => r.id === selectedSavedReportId);
    if (!report) return;
    setColumnOrder(report.columnOrder);
    setSelectedDims(report.columnOrder.filter(id => id.startsWith('d')).map(id => allItemsMap[id]).filter(Boolean));
    setSelectedMets(report.columnOrder.filter(id => id.startsWith('m')).map(id => allItemsMap[id]).filter(Boolean));
    setShowMyReportsModal(false);
    setHasGenerated(true);
  };

  // 追踪移动端视口高度（修复键盘弹起/收起导致 fixed 容器不能恢复的问题）
  const [viewportH, setViewportH] = useState(() => typeof window !== 'undefined' ? (window.visualViewport ? window.visualViewport.height : window.innerHeight) : 0);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => setViewportH(vv.height);
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, []);

  // 维度/指标底部抽屉
  const [showDimMetSheet, setShowDimMetSheet] = useState(false);
  const [sheetTab, setSheetTab] = useState('dims');
  const [collapsedSheetCats, setCollapsedSheetCats] = useState([]);

  // 筛选
  const [filterModalItem, setFilterModalItem] = useState(null);
  const [filters, setFilters] = useState({});
  const [tempRule, setTempRule] = useState('in');
  const [tempText, setTempText] = useState('');
  const [tempValues, setTempValues] = useState([]);
  const [tempSearch, setTempSearch] = useState('');

  const allItemsMap = useMemo(() => {
    const map = {};
    [...DIMENSIONS, ...METRICS].forEach(item => map[item.id] = item);
    return map;
  }, []);

  const columns = useMemo(() => columnOrder.map(id => allItemsMap[id]).filter(Boolean), [columnOrder, allItemsMap]);

  const toggleItem = (item, isDim) => {
    const list = isDim ? selectedDims : selectedMets;
    const setter = isDim ? setSelectedDims : setSelectedMets;
    const isDateGroup = isDim && item.category === '日期信息';

    if (list.find(i => i.id === item.id)) {
      setter(list.filter(i => i.id !== item.id));
      setColumnOrder(prev => prev.filter(id => id !== item.id));
    } else {
      let nextList = [...list, item];
      let nextColumnOrder;
      if (isDateGroup) {
        nextColumnOrder = [item.id, ...columnOrder];
      } else if (isDim) {
        const lastDimIdx = [...columnOrder].reduce((last, id, idx) => id.startsWith('d') ? idx : last, -1);
        nextColumnOrder = [...columnOrder];
        nextColumnOrder.splice(lastDimIdx + 1, 0, item.id);
      } else {
        nextColumnOrder = [...columnOrder, item.id];
      }

      if (isDateGroup) {
        nextList = nextList.filter(i => i.id === item.id || i.category !== '日期信息');
        nextColumnOrder = nextColumnOrder.filter(id => id === item.id || !['d1', 'd2', 'd3'].includes(id));
      }

      setter(nextList);
      setColumnOrder(nextColumnOrder);
    }

    setHasGenerated(false);
  };

  const handleGenerate = () => {
    if (selectedDims.length === 0 && selectedMets.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 800);
  };

  // 筛选
  const openFilterModal = (item) => {
    setFilterModalItem(item);
    const existing = filters[item.id] || { rule: 'in', values: [], text: '' };
    setTempRule(existing.rule);
    setTempValues(existing.values || []);
    setTempText(existing.text || '');
    setTempSearch('');
  };

  const saveFilter = () => {
    if (tempValues.length === 0 && !tempText) {
      clearFilter();
      return;
    }
    setFilters({ ...filters, [filterModalItem.id]: { rule: tempRule, values: tempValues, text: tempText } });
    setFilterModalItem(null);
    setHasGenerated(false);
  };

  const clearFilter = () => {
    const newFilters = { ...filters };
    delete newFilters[filterModalItem.id];
    setFilters(newFilters);
    setFilterModalItem(null);
    setHasGenerated(false);
  };

  // 分组
  const dimGroups = useMemo(() => {
    const groups = {};
    DIMENSIONS.forEach(d => {
      if (!groups[d.category]) groups[d.category] = [];
      groups[d.category].push(d);
    });
    return groups;
  }, []);

  const metGroups = useMemo(() => {
    const groups = {};
    METRICS.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, []);

  // Mock 数据
  const ROW_COUNT = 20;
  const tableRows = useMemo(() => {
    if (!hasGenerated) return [];
    return [...Array(ROW_COUNT)].map((_, i) => {
      const row = {};
      selectedDims.forEach(d => {
        const values = DIM_DICT[d.name] || [];
        row[d.id] = values[i % values.length] || d.name;
      });

      const sales = Math.round((Math.random() * 45000 + 5000) * 100) / 100;
      const marginRate = Math.random() * 0.3 + 0.15;
      const grossProfit = Math.round(sales * marginRate * 100) / 100;
      const psdDiv = Math.random() * 4 + 1;
      const selRate = Math.round((Math.random() * 60 + 35) * 100) / 100;
      const turnoverDays = Math.round((Math.random() * 75 + 15) * 100) / 100;
      const invAmtStart = Math.round((Math.random() * 200000 + 20000) * 100) / 100;
      const invAmtEnd = Math.round(invAmtStart * (Math.random() * 0.4 + 0.7) * 100) / 100;
      const invQtyStart = Math.round((Math.random() * 5000 + 200) * 100) / 100;
      const invQtyEnd = Math.round(invQtyStart * (Math.random() * 0.4 + 0.7) * 100) / 100;
      const orderQty = Math.round((Math.random() * 2000 + 100) * 100) / 100;

      const values = {
        m1: sales,
        m2: grossProfit,
        m3: Math.round(sales / psdDiv * 100) / 100,
        m4: Math.round(marginRate * 100 * 100) / 100,
        m5: selRate,
        m6: selRate,
        m7: turnoverDays,
        m8: invAmtStart,
        m9: invAmtEnd,
        m10: invQtyStart,
        m11: invQtyEnd,
        m12: Math.round((invQtyStart + invQtyEnd) / 2 * 100) / 100,
        m13: Math.round((invAmtStart + invAmtEnd) / 2 * 100) / 100,
        m14: orderQty,
        m15: Math.round(orderQty / psdDiv * 100) / 100,
      };
      selectedMets.forEach(m => {
        if (values[m.id] !== undefined) row[m.id] = values[m.id];
      });
      return row;
    });
  }, [hasGenerated, selectedDims, selectedMets]);

  const metricTotals = useMemo(() => {
    const totals = {};
    selectedMets.forEach(m => {
      totals[m.id] = tableRows.reduce((sum, r) => sum + (r[m.id] || 0), 0);
    });
    if (totals.m4 !== undefined && totals.m2 !== undefined && totals.m1 && totals.m1 !== 0) {
      totals.m4 = Math.round(totals.m2 / totals.m1 * 100 * 100) / 100;
    }
    if (totals.m5 !== undefined) {
      totals.m5 = Math.round(totals.m5 / tableRows.length * 100) / 100;
    }
    if (totals.m6 !== undefined) {
      totals.m6 = Math.round(totals.m6 / tableRows.length * 100) / 100;
    }
    return totals;
  }, [tableRows, selectedMets]);

  const firstDimIndex = columns.findIndex(col => col.id.startsWith('d'));

  // ── AI Chat ──
  const WELCOME_MESSAGE = {
    role: 'agent',
    content: '您好！我是玲珑报表 AI 助手。您可以：\n\n1. **用自然语言描述查询需求**，我将自动配置报表参数\n2. **执行查询后**，让我帮您分析数据、发现趋势\n3. **自由咨询**零售 BI 相关问题\n\n请随时向我提问！',
    type: 'text',
  };

  const QUICK_CHIPS = [
    { label: '查看各区域销售额', message: '帮我查看各区域的销售额和毛利额' },
    { label: '分析当前报表数据', message: '请分析当前报表数据，看看有什么值得关注的发现' },
    { label: '什么是PSD指标', message: '什么是PSD指标？在零售分析中有何用途？' },
  ];

  // Init messages when panel opens
  useEffect(() => {
    if (showAIChat && !aiInitializedRef.current) {
      setMessages([WELCOME_MESSAGE]);
      aiInitializedRef.current = true;
    }
    if (showAIChat) {
      setTimeout(() => aiInputRef.current?.focus(), 100);
    }
  }, [showAIChat]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Voice input
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
        setAiInput(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') setIsListening(false);
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
  }, []);

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
    try { recognitionRef.current?.stop(); } catch {}
  };

  const applyQueryUpdate = (params) => {
    const nextColumnOrder = [];

    if (params.dims) {
      const dimItems = params.dims.map(id => allItemsMap[id]).filter(Boolean);
      params.dims.forEach(id => {
        if (allItemsMap[id]) nextColumnOrder.push(id);
      });
      setSelectedDims(dimItems);
    }
    if (params.mets) {
      const metItems = params.mets.map(id => allItemsMap[id]).filter(Boolean);
      params.mets.forEach(id => {
        if (allItemsMap[id]) nextColumnOrder.push(id);
      });
      setSelectedMets(metItems);
    }
    if (params.columnOrder && params.columnOrder.length > 0) {
      setColumnOrder(params.columnOrder);
    } else if (nextColumnOrder.length > 0) {
      setColumnOrder(nextColumnOrder);
    }
    if (params.scenario) {
      setScenario(params.scenario);
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
      setFilters(newFilters);
    }
    setHasGenerated(false);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || aiLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed, type: 'text' }]);
    setAiInput('');
    setAiLoading(true);

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
            // skip malformed line
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
      setAiLoading(false);
    }
  };

  const handleAIKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(aiInput);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 select-none font-sans overflow-hidden">

      {/* 顶部导航栏 */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm z-30">
        <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1.5"><Gem className="w-4 h-4 text-indigo-500" />玲珑报表</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openMyReportsModal}
            className="shrink-0 w-8 h-8 bg-white border border-slate-200 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAIChat(true)}
            className="shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <BrainCircuit className="w-4 h-4" />
          </button>
          <div
            className="relative"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer text-xs font-bold text-slate-600">
            {currentUser}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </div>
          <div className="absolute right-0 top-full h-2 w-full" />
          {showUserMenu && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] w-32 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-40">
              {userList.filter(u => u !== currentUser).map(user => (
                <button
                  key={user}
                  onClick={() => { setCurrentUser(user); setShowUserMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {user}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </header>

      {/* 查询控制栏 */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3">
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {SCENARIOS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex-1 min-w-0">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">
            {scenario === 'compare' ? '本期 vs 上期' : '2023-10-01 ~ 2023-10-31'}
          </span>
        </div>
      </div>

      {/* 筛选标签行 */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
        {Object.keys(filters).length === 0 ? (
          <span className="text-[11px] text-slate-300 italic shrink-0">未设置过滤条件</span>
        ) : (
          Object.entries(filters).map(([id, filter]) => {
            const item = allItemsMap[id];
            if (!item) return null;
            return (
              <div key={id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg border text-[11px] font-bold bg-indigo-50 border-indigo-100 text-indigo-700 shrink-0">
                <span>{item.name}: {filter.values.length > 0 ? filter.values[0] : filter.text}</span>
                <button onClick={() => { const newF = {...filters}; delete newF[id]; setFilters(newF); setHasGenerated(false); }} className="p-0.5 hover:bg-black/5 rounded-md"><X className="w-2.5 h-2.5"/></button>
              </div>
            );
          })
        )}
        {Object.keys(filters).length > 0 && (
          <button onClick={() => {setFilters({}); setHasGenerated(false);}} className="text-[10px] font-bold text-slate-400 hover:text-red-500 shrink-0 ml-auto">
            <Trash2 className="w-3 h-3 inline mr-0.5" />重置
          </button>
        )}
      </div>

      {/* 操作按钮行 */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowDimMetSheet(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          配置维度/指标
          {(selectedDims.length + selectedMets.length) > 0 && (
            <span className="bg-indigo-600 text-white w-4.5 h-4.5 rounded-full text-[10px] flex items-center justify-center">{selectedDims.length + selectedMets.length}</span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer select-none transition-all ${showTotals ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
            <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} className="sr-only" />
            {showTotals ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
            合计
          </label>
          <button
            disabled={selectedDims.length === 0 && selectedMets.length === 0 || isGenerating}
            onClick={handleGenerate}
            className="shrink-0 px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-xs flex items-center gap-1.5 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {hasGenerated ? '刷新' : '查询'}
          </button>
        </div>
      </div>

      {/* 报表操作行 */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2">
        <button
          disabled={!hasGenerated}
          onClick={openSaveReportModal}
          className="shrink-0 flex-1 py-1.5 bg-slate-500 text-white rounded-lg font-black text-[11px] flex items-center justify-center gap-1.5 hover:bg-slate-600 disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          保存报表
        </button>
      </div>

      {/* 数据表格区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <span className="font-black text-slate-400 text-xs tracking-widest">加载中...</span>
          </div>
        ) : null}

        {hasGenerated && (selectedDims.length > 0 || selectedMets.length > 0) ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="min-w-max text-left border-collapse border border-slate-200">
              <thead className="bg-white border-b border-slate-200 sticky top-0 z-[1]">
                <tr>
                  {columns.map(col => {
                    const isDim = col.id.startsWith('d');
                    const hasFilter = !!filters[col.id];
                    return (
                      <th key={col.id} className="px-3 py-2 whitespace-nowrap border border-slate-200">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                          <span>{col.name}</span>
                          {hasFilter && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />}
                          <Filter
                            className={`w-3 h-3 ${isDim ? 'text-slate-300 hover:text-indigo-600' : 'text-slate-300 hover:text-orange-600'} cursor-pointer`}
                            onClick={() => openFilterModal(col)}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    {columns.map(col => (
                      col.id.startsWith('d') ? (
                        <td key={col.id} className="px-3 py-2 text-[11px] font-medium text-slate-600 whitespace-nowrap border border-slate-200">
                          {DIM_DICT[col.name] ? DIM_DICT[col.name][i % DIM_DICT[col.name].length] : `数据项-${i+1}`}
                        </td>
                      ) : (
                        <td key={col.id} className="px-3 py-2 text-[11px] font-mono text-slate-500 text-right whitespace-nowrap border border-slate-200">
                          {allItemsMap[col.id]?.unit === '%'
                            ? `${row[col.id].toFixed(1)}%`
                            : row[col.id].toLocaleString('zh-CN', {minimumFractionDigits: 1})}
                        </td>
                      )
                    ))}
                  </tr>
                ))}
              </tbody>
              {showTotals && columns.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 sticky bottom-0">
                  <tr>
                    {columns.map((col, idx) => {
                      if (col.id.startsWith('d')) {
                        return (
                          <td key={col.id} className="px-3 py-1.5 text-[11px] text-slate-500 whitespace-nowrap border border-slate-200">
                            {idx === firstDimIndex ? (
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3 text-slate-400" />
                                总记录数
                                {hasGenerated && <span className="font-black text-indigo-600 ml-0.5">{tableRows.length}</span>}
                              </span>
                            ) : ''}
                          </td>
                        );
                      }
                      if (firstDimIndex === -1 && idx === 0) {
                        return (
                          <td key={col.id} className="px-3 py-1.5 text-[11px] text-slate-500 whitespace-nowrap border border-slate-200">
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3 text-slate-400" />
                              总记录数
                              {hasGenerated && <span className="font-black text-indigo-600 ml-0.5">{tableRows.length}</span>}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={col.id} className="px-3 py-1.5 text-[11px] font-bold text-right whitespace-nowrap border border-slate-200">
                          {hasGenerated
                            ? <span className="font-mono text-indigo-700">{allItemsMap[col.id]?.unit === '%' ? `${metricTotals[col.id].toFixed(1)}%` : metricTotals[col.id].toLocaleString('zh-CN', {minimumFractionDigits: 1})}</span>
                            : <span className="text-slate-400">合计值</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
              <Play className="w-6 h-6 opacity-20" />
            </div>
            <h4 className="font-black text-slate-400 text-sm mb-1">暂无活动报表</h4>
            <p className="text-[11px] max-w-xs leading-relaxed font-medium">配置维度指标后，点击"查询"生成数据预览。</p>
          </div>
        )}
      </div>

      {/* 维度/指标 底部抽屉 */}
      {showDimMetSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowDimMetSheet(false)} />
          <div className="relative bg-white rounded-t-[2rem] max-h-[80%] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* 手柄 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            {/* Tab 切换 */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100">
              <button
                onClick={() => setSheetTab('dims')}
                className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${sheetTab === 'dims' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                维度分析
              </button>
              <button
                onClick={() => setSheetTab('mets')}
                className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${sheetTab === 'mets' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                度量指标
              </button>
            </div>
            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
              {Object.entries(sheetTab === 'dims' ? dimGroups : metGroups).map(([cat, items]) => (
                <div key={cat}>
                  <button
                    onClick={() => setCollapsedSheetCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat])}
                    className="w-full flex items-center justify-between px-3 py-2 text-slate-600 rounded-lg"
                  >
                    <span className="text-xs font-bold">{cat}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSheetCats.includes(cat) ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedSheetCats.includes(cat) && (
                    <div className="space-y-1">
                      {items.map(item => {
                        const isDim = sheetTab === 'dims';
                        const active = isDim ? selectedDims.some(i => i.id === item.id) : selectedMets.some(i => i.id === item.id);
                        const hasFilter = !!filters[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItem(item, isDim)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all ${active ? (isDim ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-orange-500 border-orange-500 text-white') : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{item.name}</span>
                              {hasFilter && <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-yellow-300' : 'bg-yellow-400'}`} />}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Filter
                                onClick={(e) => { e.stopPropagation(); openFilterModal(item); }}
                                className={`w-3 h-3 ${active ? 'text-white/70 hover:text-white' : 'opacity-0 group-hover:opacity-100 text-slate-300'}`}
                              />
                              {active ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-t-[1.5rem]">
              <button
                onClick={() => setShowDimMetSheet(false)}
                className="w-full py-3 bg-slate-800 text-white rounded-2xl font-black text-sm active:scale-[0.98] transition-all"
              >
                确定 ({selectedDims.length + selectedMets.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选弹窗（移动端全屏） */}
      {filterModalItem && (
        <div className="fixed inset-x-0 bottom-0 bg-white z-50 flex flex-col" style={{ height: viewportH }}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800">{filterModalItem.name} 筛选器</h3>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">条件配置</p>
            </div>
            <button onClick={() => setFilterModalItem(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            <div className="flex gap-3">
              <select value={tempRule} onChange={e => setTempRule(e.target.value)} className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="in">包含于</option>
                <option value="not_in">排除</option>
                <option value="contains">模糊包含</option>
                <option value="range">数值范围</option>
              </select>
              <input type="text" value={tempText} onChange={e => setTempText(e.target.value)} placeholder="输入过滤文本..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase">快速勾选</span>
              <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-lg">已选 {tempValues.length}</span>
            </div>
            <input type="text" value={tempSearch} onChange={e => setTempSearch(e.target.value)} placeholder="检索字典项..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-medium" />
            <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-2 space-y-1 max-h-52 overflow-y-auto">
              {(DIM_DICT[filterModalItem.name] || DIM_DICT['默认']).filter(v => v.includes(tempSearch)).map((val, idx) => {
                const isChecked = tempValues.includes(val);
                return (
                  <div key={idx} onClick={() => isChecked ? setTempValues(tempValues.filter(v=>v!==val)) : setTempValues([...tempValues, val])} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-white shadow-md text-indigo-700 font-bold' : 'hover:bg-white/60 text-slate-500'}`}>
                    {isChecked ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                    <span className="text-sm">{val}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-2">
              <button onClick={clearFilter} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 uppercase">
                <Trash2 className="w-4 h-4" /> 重置
              </button>
              <div className="flex gap-3">
                <button onClick={() => setFilterModalItem(null)} className="px-5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl uppercase">取消</button>
                <button onClick={saveFilter} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存报表弹窗 */}
      {showSaveReportModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white z-50 flex flex-col" style={{ height: viewportH }}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800">保存报表</h3>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">输入名称保存当前表头顺序</p>
            </div>
            <button onClick={() => setShowSaveReportModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1">报表名称</label>
                <input
                  value={saveReportName}
                  onChange={(e) => setSaveReportName(e.target.value)}
                  placeholder="输入报表名称..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-1">备注</label>
                <input
                  value={saveReportRemark}
                  onChange={(e) => setSaveReportRemark(e.target.value)}
                  placeholder="请输入备注..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">更新现有报表</h4>
                  <p className="text-[11px] text-slate-400">留空名称选择已保存记录后点击确定将覆盖该记录。</p>
                </div>
                <span className="text-[11px] text-slate-400">共 {myOwnReports.length} 条</span>
              </div>
              {myOwnReports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-[12px] text-slate-400 text-center">
                  暂未创建过报表
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {myOwnReports.map(report => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedSavedReportId(report.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-all ${selectedSavedReportId === report.id ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm">{report.name}</div>
                        <div className="text-[10px] text-slate-400">{report.updatedAt}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setShowSaveReportModal(false)} className="px-5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl uppercase">取消</button>
              <button
                onClick={saveReport}
                disabled={!saveReportName.trim() && !selectedSavedReportId}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all uppercase"
              >
                确定保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 我的报表弹窗 */}
      {showMyReportsModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white z-50 flex flex-col" style={{ height: viewportH }}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800">我的报表</h3>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5">选择已保存的报表并打开</p>
            </div>
            <button onClick={() => setShowMyReportsModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {myReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                当前暂无已保存的报表
              </div>
            ) : (
              <div className="space-y-2">
                {myReports.map(report => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedSavedReportId(report.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selectedSavedReportId === report.id ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold">{report.name}</div>
                      <div className="text-[10px] text-slate-400">{report.updatedAt}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">创建人: {report.creator}</div>
                  </button>
                ))}
              </div>
            )}
            {/* 备注 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
              <div className="mb-2 text-sm font-black">备注</div>
              <div className="min-h-[80px] rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                {selectedSavedReport ? selectedSavedReport.remark || '暂无备注内容' : '请先选择一个报表记录。'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2">
              <button
                onClick={deleteSavedReport}
                disabled={!selectedSavedReportId}
                className="px-4 py-2.5 text-xs font-black text-red-500 border border-red-200 rounded-xl hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-300 uppercase"
              >
                删除
              </button>
              <button
                onClick={loadSavedReport}
                disabled={!selectedSavedReportId}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all uppercase"
              >
                确定打开
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 助手全屏弹窗 */}
      {showAIChat && (
        <div className="fixed inset-x-0 bottom-0 bg-white z-50 flex flex-col" style={{ height: viewportH }}>
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
            <button
              onClick={() => setShowAIChat(false)}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
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

            {/* Loading */}
            {aiLoading && !messages.some(m => m.streaming) && (
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

          {/* Quick chips */}
          {messages.length <= 1 && messages[0]?.type === 'text' && !aiLoading && (
            <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.message)}
                  className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <textarea
                ref={aiInputRef}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={handleAIKeyDown}
                placeholder={isListening ? '正在聆听...' : '输入您的问题...'}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-slate-50"
                disabled={aiLoading}
              />
              {micSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={aiLoading}
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
                onClick={() => sendMessage(aiInput)}
                disabled={aiLoading || !aiInput.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Enter 发送 · Shift+Enter 换行
              {micSupported && ' · 语音输入'}
            </p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default AppMobile;
