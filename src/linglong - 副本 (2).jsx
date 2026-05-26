import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, ArrowRightLeft, TrendingUp, Clock, 
  X, Plus, ChevronDown, ChevronLeft, ChevronRight, Layout,
  Download, RefreshCw, Database, Calendar, Search, Play,
  Filter, CheckSquare, Square, Tag, Trash2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

// --- 配置数据 ---
const DIMENSIONS = [
  { id: 'd1', name: '店铺编号', category: '店铺信息' },
  { id: 'd2', name: '店铺名称', category: '店铺信息' },
  { id: 'd3', name: '区域', category: '店铺信息' },
  { id: 'd4', name: '大区', category: '店铺信息' },
  { id: 'd5', name: '督导', category: '店铺信息' },
  { id: 'd6', name: '考核门店区分', category: '店铺信息' },
  { id: 'd7', name: '店铺类型', category: '店铺信息' },
  { id: 'd8', name: '直营加盟类型', category: '店铺信息' },
  { id: 'd9', name: '既存店区分', category: '店铺信息' },
  { id: 'd10', name: '开店日期', category: '店铺信息' },
  { id: 'd11', name: '闭店日期', category: '店铺信息' },
  { id: 'd12', name: '店铺状态', category: '店铺信息' },
  { id: 'd13', name: '营业面积', category: '店铺信息' },
  { id: 'd14', name: '员工人数', category: '店铺信息' },
  { id: 'd15', name: '大类编码', category: '分类信息' },
  { id: 'd16', name: '大类名称', category: '分类信息' },
  { id: 'd17', name: '中类编码', category: '分类信息' },
  { id: 'd18', name: '中类名称', category: '分类信息' },
  { id: 'd19', name: '小类编码', category: '分类信息' },
  { id: 'd20', name: '小类名称', category: '分类信息' },
  { id: 'd21', name: '品类经理', category: '分类信息' },
  { id: 'd22', name: '采购助理', category: '分类信息' },
  { id: 'd23', name: '供应商编码', category: '供应商信息' },
  { id: 'd24', name: '供应商名称', category: '供应商信息' },
  { id: 'd25', name: '商品编码', category: '商品信息' },
  { id: 'd26', name: '商品名称', category: '商品信息' },
  { id: 'd27', name: '商品条码', category: '商品信息' },
  { id: 'd28', name: '新品标识', category: '商品信息' },
  { id: 'd29', name: '可订标识', category: '商品信息' },
];

const METRICS = [
  { id: 'm1', name: '销售额', category: '销售' },
  { id: 'm2', name: '毛利额', category: '销售' },
  { id: 'm3', name: '销售额PSD', category: '销售' },
  { id: 'm4', name: '毛利率', category: '销售', unit: '%' },
  { id: 'm5', name: '动销率', category: '销售', unit: '%' },
  { id: 'm6', name: '动销率', category: '销售', unit: '%' },
  { id: 'm7', name: '周转天数', category: '库存' },
  { id: 'm8', name: '库存金额(期初)', category: '库存' },
  { id: 'm9', name: '库存金额(期末)', category: '库存' },
  { id: 'm10', name: '库存数量(期初)', category: '库存' },
  { id: 'm11', name: '库存数量(期末)', category: '库存' },
  { id: 'm12', name: '库存数量(日均)', category: '库存' },
  { id: 'm13', name: '库存金额(日均)', category: '库存' },
  { id: 'm14', name: '订货数量', category: '进货' },
  { id: 'm15', name: '订货数量PSD', category: '进货' },
];

const SCENARIOS = [
  { id: 'query', name: '期间查询', icon: CalendarDays },
  { id: 'compare', name: '期间对比', icon: ArrowRightLeft },
  { id: 'trend', name: '期间趋势', icon: TrendingUp },
  { id: 'time', name: '时段查询', icon: Clock },
];

const DIM_DICT = {
  '店铺名称': ['门店一', '门店二', '门店三', '门店四', '门店五', '门店六', '门店七', '门店八'],
  '店铺编号': ['001', '002', '003', '004', '005', '006', '007', '008'],
  '店铺类型': ['直营店', '加盟店'],
  '督导': ['张三', '李四', '王五', '赵六'],
  '考核门店区分': ['考核门店', '非考核门店'],
  '既存店区分': ['既存店', '非既存店'],
  '大类编码': ['A001', 'A002', 'A003', 'A004', 'A005', 'A006'],
  '中类编码': ['B001', 'B002', 'B003', 'B004', 'B005', 'B006'],
  '小类编码': ['C001', 'C002', 'C003', 'C004', 'C005', 'C006'],
  '中类名称': ['食品饮料', '日用百货', '家用电器', '服装鞋帽', '美妆个护', '母婴用品'],
  '小类名称': ['生鲜食品', '休闲零食', '酒水饮料', '日用百货', '家用电器', '美妆个护'],
  '大区': ['华东大区', '华南大区', '华北大区', '西南大区', '西北大区', '东北大区', '华中大区'],
  '区域': ['上海市', '北京市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市'],
  '大类名称': ['生鲜食品', '休闲零食', '酒水饮料', '日用百货', '家用电器', '美妆个护'],
  '全店销量ABC级别': ['A类 (头部20%)', 'B类 (腰部30%)', 'C类 (尾部50%)'],
  '商品名称': ['可口可乐330ml', '伊利纯牛奶250ml', '农夫山泉500ml', '乐事薯片原味'],
  '默认': ['选项1', '选项2', '选项3', '选项4']
};

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
    if (list.find(i => i.id === item.id)) {
      setter(list.filter(i => i.id !== item.id));
    } else {
      setter([...list, item]);
    }
    setHasGenerated(false);
  };

  const handleGenerate = () => {
    if (selectedDims.length === 0 && selectedMets.length === 0) return;
    setIsGenerating(true);
    // 核心逻辑：自动折叠侧边栏
    setSidebarCollapsed(true);
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 select-none font-sans overflow-hidden">
      
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 左侧库 - 支持折叠 */}
        <aside className={`bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-80'}`}>
          <div className="mx-4 mt-4 mb-2 rounded-[1.5rem] bg-white border border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">报表类型</span>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
          
          {/* 筛选条件浮条 (Query Tags) - 紧贴上方 */}
          <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-3 min-h-[44px]">
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
              <div className="bg-slate-50/50 p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 overflow-x-auto pb-2 sm:pb-0">
                    <div className="flex items-center gap-2 min-w-max">
                      {selectedDims.length === 0 && selectedMets.length === 0 && (
                        <div className="text-xs text-slate-300 italic py-2">请从左侧拖入维度或指标...</div>
                      )}

                      {/* 维度显示 */}
                      {selectedDims.map(d => (
                        <div key={d.id} className="group relative flex items-center gap-2 pl-4 pr-2 py-2 bg-white border border-indigo-100 rounded-xl shadow-sm text-indigo-700 font-bold text-xs transition-all hover:border-indigo-300">
                          {d.name}
                          {filters[d.id] && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <Filter className="w-3 h-3 text-slate-300 hover:text-indigo-600 cursor-pointer" onClick={(e) => openFilterModal(e, d)} />
                            <X className="w-3 h-3 text-slate-300 hover:text-indigo-600 cursor-pointer" onClick={() => toggleItem(d, true)} />
                          </div>
                        </div>
                      ))}

                      {/* 指标显示 */}
                      {selectedMets.map(m => (
                        <div key={m.id} className="group relative flex items-center gap-2 pl-4 pr-2 py-2 bg-white border border-orange-100 rounded-xl shadow-sm text-orange-700 font-bold text-xs transition-all hover:border-orange-300">
                          {m.name}
                          {filters[m.id] && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <Filter className="w-3 h-3 text-slate-300 hover:text-orange-600 cursor-pointer" onClick={(e) => openFilterModal(e, m)} />
                            <X className="w-3 h-3 text-slate-300 hover:text-orange-600 cursor-pointer" onClick={() => toggleItem(m, false)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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

                {hasGenerated ? (
                  <>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        
                        <tbody className="divide-y divide-slate-50">
                          {[...Array(12)].map((_, i) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                              {selectedDims.map(d => (
                                <td key={d.id} className="px-6 py-4 text-xs font-bold text-slate-600">
                                  {DIM_DICT[d.name] ? DIM_DICT[d.name][i % DIM_DICT[d.name].length] : `数据项-${i+1}`}
                                </td>
                              ))}
                              {selectedMets.map(m => (
                                <td key={m.id} className="px-6 py-4 text-xs font-mono text-slate-500 text-right">
                                  {(Math.random()*50000).toLocaleString('zh-CN', {minimumFractionDigits: 1})}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                      <Layout className="w-8 h-8 opacity-20" />
                    </div>
                    <h4 className="font-black text-slate-400 text-lg mb-2 tracking-tight">暂无活动报表</h4>
                    <p className="text-xs max-w-xs leading-relaxed font-medium">
                      请在上方工作台拖入分析维度和度量指标，并设置必要的过滤条件，点击“执行查询”生成数据预览。
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