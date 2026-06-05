import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, ChevronDown, ChevronLeft, ChevronRight, Layout,
  Download, RefreshCw, Database, Calendar, Search, Play,
  Filter, CheckSquare, Square, Tag, Trash2, PanelLeftClose, PanelLeftOpen,
  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Gem, BrainCircuit,
  Table2, BarChart3, Settings2, Star
} from 'lucide-react';
import { DIMENSIONS, METRICS, SCENARIOS, DIM_DICT } from './data.js';
import AIChatPanel from './AIChatPanel.jsx';
import ChartView from './ChartView.jsx';
import ChartSettings from './ChartSettings.jsx';
import SheetTabs from './SheetTabs.jsx';

const SHEETS_KEY = 'linglong_sheets';

const createDefaultSheet = (index) => {
  const today = new Date();
  return {
    id: `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `报表${index || 1}`,
    scenario: 'query',
    selectedDims: [],
    selectedMets: [],
    columnOrder: [],
    filters: {},
    dateStart: `${today.getFullYear()}-01-01`,
    dateEnd: `${today.getFullYear()}-01-31`,
    compareDateStart: '',
    compareDateEnd: '',
    sortConfig: {},
    showTotals: false,
    viewMode: 'table',
    chartType: 'bar',
    chartXAxis: null,
    chartYMets: [],
    hasGenerated: false,
  };
};

const App = () => {
  // ──── Multi-sheet state ────
  const [sheets, setSheets] = useState(() => {
    try {
      const raw = localStorage.getItem(SHEETS_KEY);
      return raw ? JSON.parse(raw) : [createDefaultSheet(1)];
    } catch { return [createDefaultSheet(1)]; }
  });
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const updateActiveSheet = useCallback((updater) => {
    setSheets(prev => prev.map((s, i) => i === activeSheetIndex ? updater(s) : s));
  }, [activeSheetIndex]);

  // Derive current sheet values
  const activeSheet = sheets[activeSheetIndex];
  const {
    scenario, selectedDims, selectedMets, columnOrder, filters,
    dateStart, dateEnd, compareDateStart, compareDateEnd,
    sortConfig, showTotals, viewMode, chartType, chartXAxis, chartYMets, hasGenerated,
  } = activeSheet;

  // Persist sheets to localStorage
  useEffect(() => {
    try { localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets)); } catch {}
  }, [sheets]);

  // Sheet CRUD
  const handleAddSheet = () => {
    setSheets(prev => [...prev, createDefaultSheet(prev.length + 1)]);
    setActiveSheetIndex(sheets.length);
  };

  const handleDeleteSheet = (index) => {
    setSheets(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    if (index <= activeSheetIndex) {
      setActiveSheetIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleRenameSheet = (sheetId, newName) => {
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, name: newName } : s));
  };

  // ──── Shared UI state ────
  const [collapsedCats, setCollapsedCats] = useState([]);
  const [collapsedDimensions, setCollapsedDimensions] = useState(false);
  const [collapsedMetrics, setCollapsedMetrics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [draggingCol, setDraggingCol] = useState(null);
  const [showSaveReportModal, setShowSaveReportModal] = useState(false);
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortDragId, setSortDragId] = useState(null);
  const [saveReportName, setSaveReportName] = useState('');
  const [saveReportRemark, setSaveReportRemark] = useState('');
  const REPORTS_KEY = 'linglong_saved_reports';
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const raw = localStorage.getItem(REPORTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const persistReports = (reports) => {
    setSavedReports(prev => {
      const next = typeof reports === 'function' ? reports(prev) : reports;
      try { localStorage.setItem(REPORTS_KEY, JSON.stringify(next)); } catch { /* quota exceeded */ }
      return next;
    });
  };
  const [selectedSavedReportId, setSelectedSavedReportId] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState('管理员');
  const userList = ['管理员', '张三', '李四', '王五'];
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [dimSearch, setDimSearch] = useState('');
  const [showStarred, setShowStarred] = useState(false);
  const [showChartSettings, setShowChartSettings] = useState(false);
  const prevDimsRef = useRef([]);
  const prevMetsRef = useRef([]);
  const [chatLayout, setChatLayout] = useState(() => {
    try { return localStorage.getItem('linglong_chat_layout') || 'right'; }
    catch { return 'right'; }
  });

  // Portal — stable container moved imperatively to avoid remounts
  const rightTargetRef = useRef(null);
  const bottomTargetRef = useRef(null);
  const portalContainerRef = useRef(null);

  if (!portalContainerRef.current) {
    portalContainerRef.current = document.createElement('div');
    portalContainerRef.current.style.display = 'contents';
  }

  useLayoutEffect(() => {
    const target = chatLayout === 'right' ? rightTargetRef.current : bottomTargetRef.current;
    const container = portalContainerRef.current;
    if (target && container && container.parentNode !== target) {
      target.appendChild(container);
    }
  }, [chatLayout]);

  // --- 筛选状态 ---
  const [filterModalItem, setFilterModalItem] = useState(null);
  
  const [tempRule, setTempRule] = useState('in');
  const [tempText, setTempText] = useState('');
  const [tempValues, setTempValues] = useState([]);
  const [tempSearch, setTempSearch] = useState('');

  const allItemsMap = useMemo(() => {
    const map = {};
    [...DIMENSIONS, ...METRICS].forEach(item => map[item.id] = item);
    return map;
  }, []);

  // Auto-initialize chart axes when selectedDims/selectedMets change
  useEffect(() => {
    const currentDimIds = selectedDims.map(d => d.id);
    const currentMetIds = selectedMets.map(m => m.id);

    updateActiveSheet(s => {
      let chartXAxis = s.chartXAxis;
      if (currentDimIds.length === 0) {
        chartXAxis = null;
      } else if (!chartXAxis || !currentDimIds.includes(chartXAxis)) {
        chartXAxis = currentDimIds[0];
      }

      let chartYMets = s.chartYMets;
      if (currentMetIds.length === 0) {
        chartYMets = [];
      } else {
        const valid = chartYMets.filter(id => currentMetIds.includes(id));
        if (valid.length === 0) chartYMets = currentMetIds;
        else chartYMets = valid;
      }

      return { ...s, chartXAxis, chartYMets };
    });

    prevDimsRef.current = currentDimIds;
    prevMetsRef.current = currentMetIds;
  }, [selectedDims, selectedMets]);

  const myReports = useMemo(() => savedReports.filter(report => report.owner === currentUser), [savedReports, currentUser]);
  const myOwnReports = useMemo(() => myReports.filter(report => report.creator === currentUser), [myReports, currentUser]);
  const selectedSavedReport = useMemo(() => myReports.find(report => report.id === selectedSavedReportId) || null, [myReports, selectedSavedReportId]);
  const columns = useMemo(() => columnOrder.map(id => allItemsMap[id]).filter(Boolean), [columnOrder, allItemsMap]);

  const handleDragStart = (id) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggingCol(id);
  };

  const handleDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (id) => (e) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === id) return;
    updateActiveSheet(s => {
      const prev = s.columnOrder;
      const next = [...prev];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(id);
      if (fromIndex === -1 || toIndex === -1) return s;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      return { ...s, columnOrder: next };
    });
    setDraggingCol(null);
  };

  const handleDragEnd = () => setDraggingCol(null);

  const openSaveReportModal = () => {
    setSaveReportName(activeSheet.name);
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
      persistReports(prev => prev.map(report => report.id === selectedSavedReportId ? {
        ...report,
        updatedAt: now,
        remark: remark || report.remark,
        columnOrder: [...columnOrder],
      } : report));
    } else {
      return;
    }
    setShowSaveReportModal(false);
    setSaveReportName('');
    setSaveReportRemark('');
    if (name && name !== activeSheet.name) {
      updateActiveSheet(s => ({ ...s, name }));
    }
  };

  const openMyReportsModal = () => {
    setSelectedSavedReportId(myReports.length > 0 ? myReports[0].id : null);
    setShowMyReportsModal(true);
  };

  const deleteSavedReport = () => {
    if (!selectedSavedReportId) return;
    persistReports(prev => prev.filter(report => report.id !== selectedSavedReportId));
    const remaining = myReports.filter(report => report.id !== selectedSavedReportId);
    setSelectedSavedReportId(remaining.length > 0 ? remaining[0].id : null);
  };

  const openShareModal = () => {
    if (!selectedSavedReportId) return;
    setShareTarget(userList.filter(u => u !== currentUser)[0]);
    setShowShareModal(true);
  };

  const shareReport = () => {
    if (!selectedSavedReportId || !shareTarget) return;
    const report = savedReports.find(item => item.id === selectedSavedReportId);
    if (!report) return;
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    const sharedCopy = {
      ...report,
      id: `report-${Date.now()}`,
      owner: shareTarget,
      creator: currentUser,
      createdAt: now,
      updatedAt: now,
    };
    persistReports(prev => [...prev, sharedCopy]);
    setShowShareModal(false);
    setShareTarget(null);
  };

  const loadSavedReport = () => {
    const report = savedReports.find(item => item.id === selectedSavedReportId);
    if (!report) return;
    const newDims = report.columnOrder.filter(id => id.startsWith('d')).map(id => allItemsMap[id]).filter(Boolean);
    const newMets = report.columnOrder.filter(id => id.startsWith('m')).map(id => allItemsMap[id]).filter(Boolean);
    updateActiveSheet(s => ({ ...s, name: report.name, columnOrder: report.columnOrder, selectedDims: newDims, selectedMets: newMets, hasGenerated: true }));
    setShowMyReportsModal(false);
  };

  // --- 逻辑控制 ---
  const openFilterModal = (e, item) => {
    e.stopPropagation();
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
    const id = filterModalItem.id;
    const newFilter = { rule: tempRule, values: tempValues, text: tempText };
    updateActiveSheet(s => ({ ...s, filters: { ...s.filters, [id]: newFilter }, hasGenerated: false }));
    setFilterModalItem(null);
  };

  const clearFilter = () => {
    const id = filterModalItem.id;
    updateActiveSheet(s => {
      const newFilters = { ...s.filters };
      delete newFilters[id];
      return { ...s, filters: newFilters, hasGenerated: false };
    });
    setFilterModalItem(null);
  };

  const toggleItem = (item, isDim) => {
    updateActiveSheet(s => {
      const list = isDim ? s.selectedDims : s.selectedMets;
      const isDateGroup = isDim && item.category === '日期信息';
      const key = isDim ? 'selectedDims' : 'selectedMets';

      if (list.find(i => i.id === item.id)) {
        return {
          ...s,
          [key]: list.filter(i => i.id !== item.id),
          columnOrder: s.columnOrder.filter(id => id !== item.id),
          hasGenerated: false,
        };
      }

      let nextList = [...list, item];
      let nextColumnOrder;
      if (isDateGroup) {
        nextColumnOrder = [item.id, ...s.columnOrder];
      } else if (isDim) {
        const lastDimIdx = [...s.columnOrder].reduce((last, id, idx) => id.startsWith('d') ? idx : last, -1);
        nextColumnOrder = [...s.columnOrder];
        nextColumnOrder.splice(lastDimIdx + 1, 0, item.id);
      } else {
        nextColumnOrder = [...s.columnOrder, item.id];
      }

      if (isDateGroup) {
        nextList = nextList.filter(i => i.id === item.id || i.category !== '日期信息');
        nextColumnOrder = nextColumnOrder.filter(id => id === item.id || !['d1', 'd2', 'd3'].includes(id));
      }

      return { ...s, [key]: nextList, columnOrder: nextColumnOrder, hasGenerated: false };
    });
  };

  const handleGenerate = () => {
    if (selectedDims.length === 0 && selectedMets.length === 0) return;
    setIsGenerating(true);
    const targetSheet = activeSheetIndex;
    setTimeout(() => {
      setIsGenerating(false);
      setSheets(prev => prev.map((s, i) => i === targetSheet ? { ...s, hasGenerated: true } : s));
    }, 800);
  };

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

  const ROW_COUNT = 20;
  const tableRows = useMemo(() => {
    if (!hasGenerated) return [];
    // Find the active date dimension (d1=按日, d2=按周, d3=按月)
    const dateDim = selectedDims.find(d => d.id === 'd1' || d.id === 'd2' || d.id === 'd3');
    const rows = [...Array(ROW_COUNT)].map((_, i) => {
      const row = {};
      selectedDims.forEach(d => {
        const values = DIM_DICT[d.name] || [];
        row[d.id] = values[i % values.length] || d.name;
      });

      // Generate realistic metrics with business-logic relationships
      const sales = Math.round((Math.random() * 45000 + 5000) * 100) / 100;       // m1 销售额 5000~50000
      const marginRate = Math.random() * 0.3 + 0.15;                                // 毛利率 15%~45%
      const grossProfit = Math.round(sales * marginRate * 100) / 100;               // m2 毛利额 < 销售额
      const psdDiv = Math.random() * 4 + 1;                                        // 分摊系数
      const selRate = Math.round((Math.random() * 60 + 35) * 100) / 100;           // m5/m6 动销率 35%~95%
      const turnoverDays = Math.round((Math.random() * 75 + 15) * 100) / 100;      // m7 周转天数 15~90
      const invAmtStart = Math.round((Math.random() * 200000 + 20000) * 100) / 100; // m8 库存金额(期初)
      const invAmtEnd = Math.round(invAmtStart * (Math.random() * 0.4 + 0.7) * 100) / 100;  // m9 库存金额(期末)
      const invQtyStart = Math.round((Math.random() * 5000 + 200) * 100) / 100;   // m10 库存数量(期初)
      const invQtyEnd = Math.round(invQtyStart * (Math.random() * 0.4 + 0.7) * 100) / 100;  // m11 库存数量(期末)
      const orderQty = Math.round((Math.random() * 2000 + 100) * 100) / 100;       // m14 订货数量

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

    // Filter by date range if a date dimension is selected
    if (dateDim && dateStart && dateEnd) {
      return rows.filter(row => {
        const val = row[dateDim.id];
        if (!val) return true;
        if (dateDim.id === 'd1') {
          // 按日: YYYYMMDD -> compare with YYYY-MM-DD
          const d = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
          return d >= dateStart && d <= dateEnd;
        }
        if (dateDim.id === 'd3') {
          // 按月: YYYYMM -> compare YYYY-MM
          const m = val.slice(0, 4) + '-' + val.slice(4, 6);
          const ms = dateStart.slice(0, 7);
          const me = dateEnd.slice(0, 7);
          return m >= ms && m <= me;
        }
        // d2 (按周): skip filtering, week format doesn't map cleanly
        return true;
      });
    }

    return rows;
  }, [hasGenerated, selectedDims, selectedMets, dateStart, dateEnd]);

  const metricTotals = useMemo(() => {
    const totals = {};
    selectedMets.forEach(m => {
      totals[m.id] = tableRows.reduce((sum, r) => sum + (r[m.id] || 0), 0);
    });
    // 毛利率合计 = 毛利额合计 / 销售额合计 × 100
    if (totals.m4 !== undefined && totals.m2 !== undefined && totals.m1 && totals.m1 !== 0) {
      totals.m4 = Math.round(totals.m2 / totals.m1 * 100 * 100) / 100;
    }
    // 动销率合计 = 各行平均值
    if (totals.m5 !== undefined) {
      totals.m5 = Math.round(totals.m5 / tableRows.length * 100) / 100;
    }
    if (totals.m6 !== undefined) {
      totals.m6 = Math.round(totals.m6 / tableRows.length * 100) / 100;
    }
    return totals;
  }, [tableRows, selectedMets]);

  const firstDimIndex = columns.findIndex(col => col.id.startsWith('d'));

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 select-none font-sans overflow-hidden">

      {/* 顶部导航栏 */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><Gem className="w-5 h-5 text-indigo-500" />玲珑有数</h1>
        <div className="flex items-center gap-3">
          <button
            disabled={!hasGenerated}
            onClick={openSaveReportModal}
            className="shrink-0 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            保存
          </button>
          <button
            onClick={openMyReportsModal}
            className="shrink-0 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Layout className="w-3.5 h-3.5" />
            我的报表
          </button>
          <button
            onClick={() => setShowAIChat(prev => !prev)}
            className={`shrink-0 px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
              showAIChat
                ? 'bg-indigo-600 text-white border border-indigo-600 shadow-sm'
                : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            AI助手
          </button>
          <div
            className="relative"
            onMouseEnter={() => setShowUserMenu(true)}
            onMouseLeave={() => setShowUserMenu(false)}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <span className="text-xs font-bold text-slate-600">{currentUser}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>
          {/* 透明桥接层，消除触发区与菜单之间的间隙 */}
          <div className="absolute right-0 top-full h-2 w-full" />
          {showUserMenu && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] w-36 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-40 animate-in fade-in zoom-in-95 origin-top-right">
              {userList.filter(u => u !== currentUser).map(user => (
                <button
                  key={user}
                  onClick={() => { setCurrentUser(user); setShowUserMenu(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {user}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 左侧库 - 支持折叠 */}
        <aside className={`bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-15' : 'w-85'}`}>
          <div className="mx-4 mt-4 mb-2 rounded-[1.5rem] bg-white border border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">报表类型</span>
                <select
                  value={scenario}
                  onChange={(e) => updateActiveSheet(s => ({...s, scenario: e.target.value}))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title={sidebarCollapsed ? "展开配置栏" : "收起配置栏"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
          {/* 搜索框 — 固定不动 */}
          <div className={`px-3 py-2.5 border-b border-slate-100 ${sidebarCollapsed ? 'hidden' : ''}`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dimSearch}
                onChange={(e) => setDimSearch(e.target.value)}
                placeholder="搜索维度或指标..."
                className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                onClick={() => setShowStarred(!showStarred)}
                className={`absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-colors ${showStarred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'}`}
                title="只显示已选条目"
              >
                <Star className="w-3.5 h-3.5" fill={showStarred ? 'currentColor' : 'none'} />
              </button>
              {dimSearch && (
                <button
                  onClick={() => setDimSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center hover:bg-slate-400 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
          <div className={`${sidebarCollapsed ? 'hidden' : 'flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar'}`}>
            {/* 维度组 */}
            <div>
              <button onClick={() => setCollapsedDimensions(!collapsedDimensions)} className="w-full flex items-center justify-between px-3 py-2 text-indigo-600 hover:bg-slate-50 rounded-lg group">
                <span className="text-sm font-black uppercase tracking-widest">维度分析</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${collapsedDimensions ? '-rotate-90' : ''}`} />
              </button>
              {!collapsedDimensions && (
                <div className="mt-2 space-y-1">
                  {Object.entries(dimGroups).map(([cat, items]) => (
                    <div key={cat} className="mb-1">
                      <button onClick={() => setCollapsedCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat])} className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg group">
                        <span className="text-xs font-bold">{cat}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedCats.includes(cat) ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedCats.includes(cat) && (
                        <div className="mt-1 space-y-1">
                          {items.filter(dim => (!dimSearch || dim.name.includes(dimSearch)) && (!showStarred || selectedDims.some(s => s.id === dim.id))).map(dim => {
                            const active = selectedDims.some(i => i.id === dim.id);
                            const hasFilter = !!filters[dim.id];
                            return (
                              <div 
                                key={dim.id}
                                onClick={() => toggleItem(dim, true)}
                                className={`group flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                              >
                                <span className="text-xs font-medium">{dim.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <Filter 
                                    onClick={(e) => openFilterModal(e, dim)}
                                    className={`w-3 h-3 transition-opacity ${hasFilter ? 'opacity-100 text-yellow-300' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-white'}`} 
                                  />
                                  {active ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 指标组 */}
            <div>
              <button onClick={() => setCollapsedMetrics(!collapsedMetrics)} className="w-full flex items-center justify-between px-3 py-2 text-orange-600 hover:bg-slate-50 rounded-lg group">
                <span className="text-sm font-black uppercase tracking-widest">度量指标</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${collapsedMetrics ? '-rotate-90' : ''}`} />
              </button>
              {!collapsedMetrics && (
                <div className="mt-2 space-y-1">
                  {Object.entries(metGroups).map(([cat, items]) => (
                    <div key={cat} className="mb-1">
                      <button onClick={() => setCollapsedCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat])} className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg">
                        <span className="text-xs font-bold">{cat}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedCats.includes(cat) ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedCats.includes(cat) && (
                        <div className="mt-1 space-y-1">
                          {items.filter(met => (!dimSearch || met.name.includes(dimSearch)) && (!showStarred || selectedMets.some(s => s.id === met.id))).map(met => {
                            const active = selectedMets.some(i => i.id === met.id);
                            const hasFilter = !!filters[met.id];
                            return (
                              <div 
                                key={met.id}
                                onClick={() => toggleItem(met, false)}
                                className={`group flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all ${active ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                              >
                                <span className="text-xs font-medium">{met.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <Filter 
                                    onClick={(e) => openFilterModal(e, met)}
                                    className={`w-3 h-3 transition-opacity ${hasFilter ? 'opacity-100 text-yellow-100' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-white'}`} 
                                  />
                                  {active ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* 右侧主区：合二为一的交互式报表 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 核心整合面板 */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">

              {/* 工具栏行 — 左侧视图切换 tabs，右侧操作按钮 */}
              <div className="bg-slate-50/50 px-5 py-2.5 border-b border-slate-100 flex items-center gap-3">
                {/* 视图切换 tabs */}
                <div className="flex items-center bg-slate-200/60 rounded-xl p-0.5">
                  <button
                    onClick={() => updateActiveSheet(s => ({...s, viewMode: 'table'}))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    表格
                  </button>
                  <button
                    onClick={() => updateActiveSheet(s => ({...s, viewMode: 'chart'}))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                      viewMode === 'chart'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    图形
                  </button>
                </div>

                {/* 图示设置按钮 — 仅在图形模式下显示 */}
                {viewMode === 'chart' && (
                  <button
                    onClick={() => setShowChartSettings(prev => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                      showChartSettings
                        ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                    title="图示设置"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    设置
                  </button>
                )}

                {(selectedDims.length === 0 && selectedMets.length === 0) && (
                  <div className="flex-1 text-xs text-slate-300 italic">请从左侧拖入维度或指标...</div>
                )}
                <div className="flex-1" />

                <button
                  disabled={selectedDims.length === 0 && selectedMets.length === 0 || isGenerating}
                  onClick={handleGenerate}
                  className="shrink-0 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 shadow-sm shadow-indigo-200 transition-all active:scale-95"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  {hasGenerated ? '重新生成' : '执行查询'}
                </button>
                <button
                  disabled={!hasGenerated}
                  onClick={() => {}}
                  className="shrink-0 px-3.5 py-1.5 bg-slate-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300 shadow-sm transition-all active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  导出
                </button>
              </div>

              {/* 筛选条件浮条 — 紧贴报表区 */}
              <div className="mx-4 mt-3 mb-1 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 shadow-sm flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-400 border-r pr-3 border-slate-100 whitespace-nowrap">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">全局筛选:</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-2xl border border-slate-200">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  {scenario === 'compare' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-slate-400">本期</span>
                        <input type="date" value={dateStart} onChange={(e) => updateActiveSheet(s => ({...s, dateStart: e.target.value}))}
                          className="w-[120px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                        <span className="text-[10px] text-slate-300">~</span>
                        <input type="date" value={dateEnd} onChange={(e) => updateActiveSheet(s => ({...s, dateEnd: e.target.value}))}
                          className="w-[120px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                      </div>
                      <div className="text-[10px] font-black text-slate-300">vs</div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-slate-400">上期</span>
                        <input type="date" value={compareDateStart} onChange={(e) => updateActiveSheet(s => ({...s, compareDateStart: e.target.value}))}
                          className="w-[120px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                        <span className="text-[10px] text-slate-300">~</span>
                        <input type="date" value={compareDateEnd} onChange={(e) => updateActiveSheet(s => ({...s, compareDateEnd: e.target.value}))}
                          className="w-[120px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input type="date" value={dateStart} onChange={(e) => { updateActiveSheet(s => ({...s, dateStart: e.target.value, hasGenerated: false})); }}
                        className="w-[126px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                      <span className="text-[10px] text-slate-300 font-medium">~</span>
                      <input type="date" value={dateEnd} onChange={(e) => { updateActiveSheet(s => ({...s, dateEnd: e.target.value, hasGenerated: false})); }}
                        className="w-[126px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-wrap gap-2 ml-4">
                  {Object.keys(filters).length === 0 ? (
                    <span className="text-xs text-slate-300 italic">未设置过滤条件</span>
                  ) : (
                    Object.entries(filters).map(([id, filter]) => {
                      const item = allItemsMap[id];
                      if (!item) return null;
                      const isDim = DIMENSIONS.find(d => d.id === id);
                      return (
                        <div key={id} className={`flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg border text-[11px] font-bold transition-all ${isDim ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                          <span>{item.name}:</span>
                          <span className="opacity-60 font-medium truncate max-w-[100px]">
                            {filter.values.length > 0 ? `${filter.values[0]}${filter.values.length > 1 ? '...' : ''}` : filter.text}
                          </span>
                          <div className="flex items-center gap-0.5 ml-1">
                             <button onClick={(e) => openFilterModal(e, item)} className="p-0.5 hover:bg-black/5 rounded-md"><Filter className="w-2.5 h-2.5"/></button>
                             <button onClick={() => { updateActiveSheet(s => { const newF = {...s.filters}; delete newF[id]; return {...s, filters: newF, hasGenerated: false}; }); }} className="p-0.5 hover:bg-black/5 rounded-md"><X className="w-2.5 h-2.5"/></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {Object.keys(filters).length > 0 && (
                  <button onClick={() => { updateActiveSheet(s => ({...s, filters: {}, hasGenerated: false})); }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 ml-2">
                    <Trash2 className="w-3 h-3" /> 重置
                  </button>
                )}
              </div>

              {/* 排序与合计控制行 — 仅表格模式显示 */}
              {viewMode !== 'chart' && (
              <div className="px-5 py-1.5 border-b border-slate-100 flex items-center gap-2 bg-white">
                <button
                  onClick={() => setShowSortModal(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-all ${
                    Object.keys(sortConfig).length > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  排序
                </button>
                <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-all ${
                  showTotals ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                  <input type="checkbox" checked={showTotals} onChange={(e) => updateActiveSheet(s => ({...s, showTotals: e.target.checked}))} className="sr-only" />
                  {showTotals ? <CheckSquare className="w-3 h-3 text-indigo-600" /> : <Square className="w-3 h-3 text-slate-400" />}
                  合计
                </label>
              </div>
              )}

              {/* 数据结果区 (Integrated Data Grid) */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                {isGenerating ? (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <Database className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="mt-4 font-black text-slate-400 text-xs tracking-widest uppercase">Fetching Records...</span>
                  </div>
                ) : null}

                {(selectedDims.length > 0 || selectedMets.length > 0) ? (
                  viewMode === 'chart' ? (
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <ChartView
                        chartType={chartType}
                        data={tableRows}
                        xKey={chartXAxis}
                        yKeys={chartYMets.map(id => {
                          const met = allItemsMap[id];
                          return { id, name: met?.name || id, unit: met?.unit };
                        })}
                        hasGenerated={hasGenerated}
                      />
                    </div>
                  ) : (
                  <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="min-w-max text-left border-collapse table-fixed border border-slate-200">
                      <thead className="bg-white border-b border-slate-200 sticky top-0 z-[1]">
                        <tr>
                          <th className="px-2 py-2 align-middle text-center w-[44px] border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400 select-none">#</th>
                          {columns.map(col => {
                            const isDim = col.id.startsWith('d');
                            return (
                              <th
                                key={col.id}
                                draggable="true"
                                onDragStart={handleDragStart(col.id)}
                                onDragOver={handleDragOver(col.id)}
                                onDrop={handleDrop(col.id)}
                                onDragEnd={handleDragEnd}
                                className={`px-3 py-2 align-middle whitespace-nowrap w-[105px] border border-slate-200 cursor-grab ${draggingCol === col.id ? 'opacity-70' : ''}`}
                              >
                                <div className="group relative inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white/90 border border-slate-100 rounded-lg shadow-sm text-slate-700 font-bold text-[11px] transition-all hover:border-slate-300">
                                  {col.name}
                                  {filters[col.id] && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                    <Filter
                                      className={`w-3 h-3 ${isDim ? 'text-slate-300 hover:text-indigo-600' : 'text-slate-300 hover:text-orange-600'} cursor-pointer`}
                                      onClick={(e) => openFilterModal(e, col)}
                                    />
                                    <X
                                      className={`w-3 h-3 ${isDim ? 'text-slate-300 hover:text-indigo-600' : 'text-slate-300 hover:text-orange-600'} cursor-pointer`}
                                      onClick={() => toggleItem(col, isDim)}
                                    />
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      {hasGenerated && (
                        <tbody className="divide-y divide-slate-200">
                          {tableRows.map((row, i) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-2 py-2 text-center text-[10px] text-slate-400 leading-tight whitespace-nowrap w-[44px] border border-slate-200 bg-slate-50/60 select-none">{i + 1}</td>
                              {columns.map(col => (
                                col.id.startsWith('d') ? (
                                  <td key={col.id} className="px-3 py-2 text-[11px] font-medium text-slate-600 leading-tight whitespace-nowrap w-[105px] border border-slate-200">
                                    {row[col.id] != null ? row[col.id] : DIM_DICT[col.name] ? DIM_DICT[col.name][i % DIM_DICT[col.name].length] : `数据项-${i+1}`}
                                  </td>
                                ) : (
                                  <td key={col.id} className="px-3 py-2 text-[11px] font-mono text-slate-500 text-right leading-tight whitespace-nowrap w-[105px] border border-slate-200">
                                    {allItemsMap[col.id]?.unit === '%'
                                      ? `${row[col.id].toFixed(1)}%`
                                      : row[col.id].toLocaleString('zh-CN', {minimumFractionDigits: 1})}
                                  </td>
                                )
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      )}
                      {showTotals && columns.length > 0 && (
                        <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 sticky bottom-0">
                          <tr>
                            <td className="px-2 py-1.5 text-center w-[44px] border border-slate-200 bg-slate-100" />
                            {columns.map((col, idx) => {
                              if (col.id.startsWith('d')) {
                                return (
                                  <td key={col.id} className="px-4 py-1.5 text-[11px] text-slate-500 leading-tight whitespace-nowrap border border-slate-200">
                                    {idx === firstDimIndex ? (
                                      <span className="flex items-center gap-1.5">
                                        <Database className="w-3 h-3 text-slate-400" />
                                        总记录数
                                        {hasGenerated && <span className="font-black text-indigo-600 ml-1">{tableRows.length.toLocaleString('zh-CN')}</span>}
                                      </span>
                                    ) : ''}
                                  </td>
                                );
                              }

                              if (firstDimIndex === -1 && idx === 0) {
                                return (
                                  <td key={col.id} className="px-4 py-1.5 text-[11px] text-slate-500 leading-tight whitespace-nowrap border border-slate-200">
                                    <span className="flex items-center gap-1.5">
                                      <Database className="w-3 h-3 text-slate-400" />
                                      总记录数
                                      {hasGenerated && <span className="font-black text-indigo-600 ml-1">{tableRows.length.toLocaleString('zh-CN')}</span>}
                                    </span>
                                  </td>
                                );
                              }

                              return (
                                <td key={col.id} className="px-4 py-1.5 text-[11px] font-bold text-right leading-tight whitespace-nowrap border border-slate-200">
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
                    {!hasGenerated && (
                      <div className="flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                          <Layout className="w-8 h-8 opacity-20" />
                        </div>
                        <h4 className="font-black text-slate-400 text-lg mb-2 tracking-tight">暂无活动报表</h4>
                        <p className="text-xs max-w-xs leading-relaxed font-medium">
                          点击上方"执行查询"生成数据预览。
                        </p>
                      </div>
                    )}
                  </div>
                  )
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                      <Layout className="w-8 h-8 opacity-20" />
                    </div>
                    <h4 className="font-black text-slate-400 text-lg mb-2 tracking-tight">暂无活动报表</h4>
                    <p className="text-xs max-w-xs leading-relaxed font-medium">
                      请在上方工作台拖入分析维度和度量指标，并设置必要的过滤条件，点击"执行查询"生成数据预览。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Portal target for bottom panel mode */}
          <div ref={bottomTargetRef} />
        </main>
        {/* Chart settings panel */}
        {viewMode === 'chart' && (
          <ChartSettings
            visible={showChartSettings}
            selectedDims={selectedDims}
            selectedMets={selectedMets}
            chartType={chartType}
            xAxisDim={chartXAxis}
            yAxisMets={chartYMets}
            onChartTypeChange={(t) => updateActiveSheet(s => ({...s, chartType: t}))}
            onXAxisChange={(id) => updateActiveSheet(s => ({...s, chartXAxis: id}))}
            onYAxisChange={(ids) => updateActiveSheet(s => ({...s, chartYMets: ids}))}
            onClose={() => setShowChartSettings(false)}
          />
        )}
        {/* Portal target for right panel mode */}
        <div ref={rightTargetRef} className="shrink-0 flex" />
      </div>

      {/* Excel-style sheet tabs */}
      <SheetTabs
        sheets={sheets}
        activeSheetIndex={activeSheetIndex}
        onSwitch={setActiveSheetIndex}
        onAdd={handleAddSheet}
        onRename={handleRenameSheet}
        onDelete={handleDeleteSheet}
      />

      {/* 筛选弹窗 (保持不变) */}
      {filterModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800 tracking-tight">{filterModalItem.name} 筛选器</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Logic & Dictionary configuration</p>
                </div>
              </div>
              <button onClick={() => setFilterModalItem(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="p-8 flex flex-col gap-8 overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">条件配置</div>
                <div className="flex gap-3">
                  <select value={tempRule} onChange={e => setTempRule(e.target.value)} className="w-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="in">包含于 (IN)</option>
                    <option value="not_in">排除 (NOT IN)</option>
                    <option value="contains">模糊包含 (LIKE)</option>
                    <option value="range">数值范围 (BETWEEN)</option>
                  </select>
                  <input type="text" value={tempText} onChange={e => setTempText(e.target.value)} placeholder="输入过滤文本..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">快速勾选</div>
                   <span className="text-[10px] font-black bg-indigo-600 text-white px-2.5 py-1 rounded-lg">已选 {tempValues.length} 项</span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={tempSearch} onChange={e => setTempSearch(e.target.value)} placeholder="检索字典项..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:border-indigo-500 outline-none shadow-sm font-medium" />
                </div>
                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/50 p-2 space-y-1 max-h-60 custom-scrollbar">
                  {(DIM_DICT[filterModalItem.name] || DIM_DICT['默认']).filter(v => v.includes(tempSearch)).map((val, idx) => {
                    const isChecked = tempValues.includes(val);
                    return (
                      <div key={idx} onClick={() => isChecked ? setTempValues(tempValues.filter(v=>v!==val)) : setTempValues([...tempValues, val])} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-white shadow-md text-indigo-700 font-black scale-[1.01] border border-indigo-50' : 'hover:bg-white/60 text-slate-500'}`}>
                        {isChecked ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                        <span className="text-sm">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button onClick={clearFilter} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">
                <Trash2 className="w-4 h-4" /> 重置筛选
              </button>
              <div className="flex gap-4">
                <button onClick={() => setFilterModalItem(null)} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest">取消</button>
                <button onClick={saveFilter} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">保存规则</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSaveReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">保存报表</h3>
                <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest">请输入报表名称以保存当前表头顺序</p>
              </div>
              <button onClick={() => setShowSaveReportModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 flex flex-col gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">保存新报表</h4>
                    <p className="text-[11px] text-slate-400">输入报表名称后点击"确定保存"将创建新报表记录。</p>
                  </div>
                  <div className="text-[12px] text-slate-400">已保存 {myReports.length} 条记录</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-black text-slate-700">报表名称</label>
                    <input
                      value={saveReportName}
                      onChange={(e) => setSaveReportName(e.target.value)}
                      placeholder="输入报表名称..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700">备注</label>
                    <input
                      value={saveReportRemark}
                      onChange={(e) => setSaveReportRemark(e.target.value)}
                      placeholder="请输入备注..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">更新现有报表</h4>
                    <p className="text-[11px] text-slate-400">留空报表名称并选择自己创建的记录，点击"确定保存"将覆盖该记录。</p>
                  </div>
                  <span className="text-[12px] text-slate-400">共 {myOwnReports.length} 条</span>
                </div>
                {myOwnReports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-[13px] text-slate-500">
                    暂未创建过报表，输入名称后可创建新报表。
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                    {myOwnReports.map(report => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setSelectedSavedReportId(report.id)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selectedSavedReportId === report.id ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-bold text-slate-900">{report.name}</div>
                          <div className="text-[11px] text-slate-400">{report.updatedAt}</div>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">创建人: {report.creator}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setShowSaveReportModal(false)} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest">取消</button>
              <button
                onClick={saveReport}
                disabled={!saveReportName.trim() && !selectedSavedReportId}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none active:scale-95 transition-all uppercase tracking-widest"
              >
                确定保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showMyReportsModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">我的报表</h3>
                <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest">选择已保存的报表并打开</p>
              </div>
              <button onClick={() => setShowMyReportsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              {myReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400 lg:col-span-2">
                  当前暂无已保存的报表
                </div>
              ) : (
                <div className="space-y-3">
                  {myReports.map(report => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedSavedReportId(report.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selectedSavedReportId === report.id ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-bold">{report.name}</div>
                        <div className="text-[11px] text-slate-400">{report.updatedAt}</div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">创建人: {report.creator}</div>
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black">备注</div>
                    <div className="text-[11px] text-slate-400">选择行后可查看备注内容</div>
                  </div>
                </div>
                <div className="min-h-[180px] rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  {selectedSavedReport ? selectedSavedReport.remark || '暂无备注内容' : '请先选择一个报表记录以查看备注。'}
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between gap-3">
              <button
                onClick={deleteSavedReport}
                disabled={!selectedSavedReportId}
                className="px-6 py-2.5 text-xs font-black text-red-500 border border-red-200 rounded-xl hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors uppercase tracking-widest"
              >
                删除
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={openShareModal}
                  disabled={!selectedSavedReportId}
                  className="px-6 py-2.5 text-xs font-black text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors uppercase tracking-widest"
                >
                  分享
                </button>
                <button
                  onClick={loadSavedReport}
                  disabled={!selectedSavedReportId}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all uppercase tracking-widest"
                >
                  确定打开
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">分享报表</h3>
                <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest">请选择分享对象，将该报表加入对方报表记录</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 flex flex-col gap-4">
              <div className="space-y-2">
                <div className="text-sm font-black text-slate-900">分享给</div>
                <div className="grid gap-3">
                  {userList.filter(u => u !== currentUser).map(person => (
                    <button
                      key={person}
                      type="button"
                      onClick={() => setShareTarget(person)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${shareTarget === person ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setShowShareModal(false)} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest">取消</button>
              <button
                onClick={shareReport}
                disabled={!shareTarget}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 active:scale-95 transition-all uppercase tracking-widest"
              >
                确定分享
              </button>
            </div>
          </div>
        </div>
      )}

      {showSortModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">自定义排序</h3>
                <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest">拖拽调整列序 · 设置排序方向</p>
              </div>
              <button onClick={() => setShowSortModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 flex flex-col gap-4">
              {columns.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm font-medium">暂无表头列，请先从左侧添加维度或指标。</div>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                  {columns.map((col, idx) => (
                    <div
                      key={col.id}
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', col.id);
                        setSortDragId(col.id);
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer.getData('text/plain');
                        if (!fromId || fromId === col.id) return;
                        updateActiveSheet(s => {
                          const prev = s.columnOrder;
                          const next = [...prev];
                          const fromIdx = next.indexOf(fromId);
                          const toIdx = next.indexOf(col.id);
                          if (fromIdx === -1 || toIdx === -1) return s;
                          next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, fromId);
                          return { ...s, columnOrder: next, hasGenerated: false };
                        });
                        setSortDragId(null);
                      }}
                      onDragEnd={() => setSortDragId(null)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${sortDragId === col.id ? 'opacity-50 bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400 shrink-0">{idx + 1}</span>
                      <span className="text-sm font-bold text-slate-700 flex-1">{col.name}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`sort-${col.id}`}
                            checked={sortConfig[col.id] === 'asc'}
                            onChange={() => updateActiveSheet(s => ({...s, sortConfig: {...s.sortConfig, [col.id]: 'asc'}}))}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sortConfig[col.id] === 'asc' ? 'border-amber-500' : 'border-slate-300'}`}>
                            {sortConfig[col.id] === 'asc' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <ArrowUp className={`w-3.5 h-3.5 ${sortConfig[col.id] === 'asc' ? 'text-amber-600' : 'text-slate-300'}`} />
                          <span className={`text-xs font-bold ${sortConfig[col.id] === 'asc' ? 'text-amber-700' : 'text-slate-400'}`}>升序</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`sort-${col.id}`}
                            checked={sortConfig[col.id] === 'desc'}
                            onChange={() => updateActiveSheet(s => ({...s, sortConfig: {...s.sortConfig, [col.id]: 'desc'}}))}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sortConfig[col.id] === 'desc' ? 'border-amber-500' : 'border-slate-300'}`}>
                            {sortConfig[col.id] === 'desc' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <ArrowDown className={`w-3.5 h-3.5 ${sortConfig[col.id] === 'desc' ? 'text-amber-600' : 'text-slate-300'}`} />
                          <span className={`text-xs font-bold ${sortConfig[col.id] === 'desc' ? 'text-amber-700' : 'text-slate-400'}`}>降序</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => { updateActiveSheet(s => ({...s, sortConfig: {}})); setShowSortModal(false); }}
                className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" /> 重置排序
              </button>
              <div className="flex gap-4">
                <button onClick={() => setShowSortModal(false)} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest">取消</button>
                <button
                  onClick={() => { setShowSortModal(false); updateActiveSheet(s => ({...s, hasGenerated: false})); }}
                  className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all uppercase tracking-widest"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal: stable container ref — never remounts AIChatPanel */}
      {createPortal(
        <AIChatPanel
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
          layout={chatLayout}
          onToggleLayout={() => {
            const next = chatLayout === 'right' ? 'bottom' : 'right';
            setChatLayout(next);
            try { localStorage.setItem('linglong_chat_layout', next); } catch {}
          }}
          scenario={scenario}
          selectedDims={selectedDims}
          selectedMets={selectedMets}
          columnOrder={columnOrder}
          filters={filters}
          hasGenerated={hasGenerated}
          tableRows={tableRows}
          allItemsMap={allItemsMap}
          onUpdateScenario={(v) => updateActiveSheet(s => ({...s, scenario: v}))}
          onUpdateDims={(v) => updateActiveSheet(s => ({...s, selectedDims: v}))}
          onUpdateMets={(v) => updateActiveSheet(s => ({...s, selectedMets: v}))}
          onUpdateColumnOrder={(v) => updateActiveSheet(s => ({...s, columnOrder: v}))}
          onUpdateFilters={(v) => updateActiveSheet(s => ({...s, filters: v}))}
          onSetHasGenerated={(v) => updateActiveSheet(s => ({...s, hasGenerated: v}))}
        />,
        portalContainerRef.current
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

export default App;