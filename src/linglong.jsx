import React, { useState, useMemo } from 'react';
import {
  X, Plus, ChevronDown, ChevronLeft, ChevronRight, Layout,
  Download, RefreshCw, Database, Calendar, Search, Play,
  Filter, CheckSquare, Square, Tag, Trash2, PanelLeftClose, PanelLeftOpen,
  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Gem, BrainCircuit
} from 'lucide-react';
import { DIMENSIONS, METRICS, SCENARIOS, DIM_DICT } from './data.js';
import AIChatPanel from './AIChatPanel.jsx';

const App = () => {
  const [scenario, setScenario] = useState('query');
  const [selectedDims, setSelectedDims] = useState([]);
  const [selectedMets, setSelectedMets] = useState([]);
  const [collapsedCats, setCollapsedCats] = useState([]);
  const [collapsedDimensions, setCollapsedDimensions] = useState(false);
  const [collapsedMetrics, setCollapsedMetrics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [columnOrder, setColumnOrder] = useState([]);
  const [draggingCol, setDraggingCol] = useState(null);
  const [showSaveReportModal, setShowSaveReportModal] = useState(false);
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({});
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

  // --- 筛选状态 ---
  const [filterModalItem, setFilterModalItem] = useState(null);
  const [filters, setFilters] = useState({}); // { id: { rule, values, text } }
  
  const [tempRule, setTempRule] = useState('in');
  const [tempText, setTempText] = useState('');
  const [tempValues, setTempValues] = useState([]);
  const [tempSearch, setTempSearch] = useState('');

  const allItemsMap = useMemo(() => {
    const map = {};
    [...DIMENSIONS, ...METRICS].forEach(item => map[item.id] = item);
    return map;
  }, []);

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
    setColumnOrder(prev => {
      const next = [...prev];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      return next;
    });
    setDraggingCol(null);
  };

  const handleDragEnd = () => setDraggingCol(null);

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
    setColumnOrder(report.columnOrder);
    setSelectedDims(report.columnOrder.filter(id => id.startsWith('d')).map(id => allItemsMap[id]).filter(Boolean));
    setSelectedMets(report.columnOrder.filter(id => id.startsWith('m')).map(id => allItemsMap[id]).filter(Boolean));
    setShowMyReportsModal(false);
    setHasGenerated(true);
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
    setFilters({
      ...filters,
      [filterModalItem.id]: { rule: tempRule, values: tempValues, text: tempText }
    });
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
    return [...Array(ROW_COUNT)].map((_, i) => {
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
  }, [hasGenerated, selectedDims, selectedMets]);

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
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><Gem className="w-5 h-5 text-indigo-500" />玲珑报表</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openMyReportsModal}
            className="shrink-0 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Layout className="w-3.5 h-3.5" />
            我的报表
          </button>
          <button
            onClick={() => setShowAIChat(true)}
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
                  onChange={(e) => setScenario(e.target.value)}
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
          <div className={`${sidebarCollapsed ? 'hidden' : 'flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar'}`}>
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">维度指标库</span>
              <RefreshCw className="w-3.5 h-3.5 text-slate-300 hover:rotate-180 transition-transform duration-500 cursor-pointer" />
            </div>
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
                          {items.map(dim => {
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
                          {items.map(met => {
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
          
          {/* 筛选条件浮条 (Query Tags) - 与左侧"报表类型"卡片同高同样式 */}
          <div className="mx-4 mt-4 mb-2 rounded-[1.5rem] bg-white border border-slate-200 px-4 py-3 shadow-sm flex items-center gap-3 min-h-[56px]">
             <div className="flex items-center gap-2 text-slate-400 border-r pr-3 border-slate-100 whitespace-nowrap">
               <Tag className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black uppercase">全局筛选:</span>
             </div>
             <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
               <Calendar className="w-3 h-3 text-slate-400" />
               {scenario === 'compare' ? (
                 <div className="flex items-center gap-2">
                     <div className="px-2 py-1 bg-white rounded-xl border text-[10px] shadow-sm">本期: 2023-10-01 ~ 2023-10-31</div>
                     <div className="text-slate-300">vs</div>
                     <div className="px-2 py-1 bg-white rounded-xl border text-[10px] shadow-sm">上期: 2023-09-01 ~ 2023-09-30</div>
                 </div>
               ) : (
                 <span className="font-black tracking-wide">2023-10-01 ~ 2023-10-31</span>
               )}
               <div className="h-3 w-px bg-slate-300 mx-1"></div>
               <Search className="w-3 h-3 text-indigo-500 cursor-pointer" />
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
                          <button onClick={() => { const newF = {...filters}; delete newF[id]; setFilters(newF); setHasGenerated(false); }} className="p-0.5 hover:bg-black/5 rounded-md"><X className="w-2.5 h-2.5"/></button>
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
             {Object.keys(filters).length > 0 && (
               <button onClick={() => {setFilters({}); setHasGenerated(false);}} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 ml-2">
                 <Trash2 className="w-3 h-3" /> 重置
               </button>
             )}
          </div>

          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden gap-4">
            {/* 核心整合面板 */}
            <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              
              {/* 报表拼装工作台 (Integrated Workbench Header) */}
              <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSortModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${Object.keys(sortConfig).length > 0 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    排序
                  </button>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${showTotals ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={showTotals}
                      onChange={(e) => setShowTotals(e.target.checked)}
                      className="sr-only"
                    />
                    {showTotals ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                    显示合计
                  </label>
                  {(selectedDims.length === 0 && selectedMets.length === 0) && (
                    <div className="flex-1 text-xs text-slate-300 italic">请从左侧拖入维度或指标...</div>
                  )}
                  <div className="flex-1" />
                  <button
                    disabled={selectedDims.length === 0 && selectedMets.length === 0 || isGenerating}
                    onClick={handleGenerate}
                    className="shrink-0 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    {hasGenerated ? '重新生成' : '执行查询'}
                  </button>
                  <button
                    disabled={!hasGenerated}
                    onClick={() => {}}
                    className="shrink-0 px-6 py-2.5 bg-slate-500 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-600 disabled:bg-slate-100 disabled:text-slate-300 shadow-lg shadow-slate-200 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    导出数据
                  </button>
                  <button
                    disabled={!hasGenerated}
                    onClick={openSaveReportModal}
                    className="shrink-0 px-6 py-2.5 bg-slate-500 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-600 disabled:bg-slate-100 disabled:text-slate-300 shadow-lg shadow-slate-200 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    保存报表
                  </button>
                </div>
              </div>

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
                  <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="min-w-max text-left border-collapse table-fixed border border-slate-200">
                      <thead className="bg-white border-b border-slate-200 sticky top-0 z-[1]">
                        <tr>
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
                                className={`px-3 py-2 align-middle whitespace-nowrap w-[150px] border border-slate-200 cursor-grab ${draggingCol === col.id ? 'opacity-70' : ''}`}
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
                              {columns.map(col => (
                                col.id.startsWith('d') ? (
                                  <td key={col.id} className="px-3 py-2 text-[11px] font-medium text-slate-600 leading-tight whitespace-nowrap w-[150px] border border-slate-200">
                                    {row[col.id] != null ? row[col.id] : DIM_DICT[col.name] ? DIM_DICT[col.name][i % DIM_DICT[col.name].length] : `数据项-${i+1}`}
                                  </td>
                                ) : (
                                  <td key={col.id} className="px-3 py-2 text-[11px] font-mono text-slate-500 text-right leading-tight whitespace-nowrap w-[150px] border border-slate-200">
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
        </main>
      </div>

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
                        setColumnOrder(prev => {
                          const next = [...prev];
                          const fromIdx = next.indexOf(fromId);
                          const toIdx = next.indexOf(col.id);
                          if (fromIdx === -1 || toIdx === -1) return prev;
                          next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, fromId);
                          return next;
                        });
                        setSortDragId(null);
                        setHasGenerated(false);
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
                            onChange={() => setSortConfig(prev => ({ ...prev, [col.id]: 'asc' }))}
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
                            onChange={() => setSortConfig(prev => ({ ...prev, [col.id]: 'desc' }))}
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
                onClick={() => { setSortConfig({}); setShowSortModal(false); }}
                className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" /> 重置排序
              </button>
              <div className="flex gap-4">
                <button onClick={() => setShowSortModal(false)} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest">取消</button>
                <button
                  onClick={() => { setShowSortModal(false); setHasGenerated(false); }}
                  className="px-8 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all uppercase tracking-widest"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />

      {/* AI Chat Panel */}
      <AIChatPanel
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        scenario={scenario}
        selectedDims={selectedDims}
        selectedMets={selectedMets}
        columnOrder={columnOrder}
        filters={filters}
        hasGenerated={hasGenerated}
        tableRows={tableRows}
        allItemsMap={allItemsMap}
        onUpdateScenario={setScenario}
        onUpdateDims={setSelectedDims}
        onUpdateMets={setSelectedMets}
        onUpdateColumnOrder={setColumnOrder}
        onUpdateFilters={setFilters}
        onSetHasGenerated={setHasGenerated}
      />
    </div>
  );
};

export default App;