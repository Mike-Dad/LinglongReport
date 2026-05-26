import React, { useState, useEffect } from 'react';
import cubejs from '@cubejs-client/core';
import { 
  Send, Zap, LayoutDashboard, Database, AlertCircle, 
  Code, ShieldCheck, BrainCircuit, BarChart3, LineChart, 
  PieChart, TrendingUp, Table, ChevronDown, ChevronUp,
  Bug, Menu, X
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// ==========================================
// 1. 初始化 Cube.js 客户端 (预览模式使用 Mock)
// ==========================================
const cubejsApi = cubejs('myapisecret', {
  apiUrl: 'http://172.21.56.115:4000/cubejs-api/v1' 
});

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ==========================================
// 2. 动态报表渲染组件
// ==========================================
const DynamicWidget = ({ dsl }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDSL, setShowDSL] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const resultSet = await cubejsApi.load(dsl.cubeQuery);
        if (isMounted) {
          setData(resultSet.chartPivot());
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "获取数据失败");
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [dsl]);

  const renderChart = () => {
    if (data.length === 0) return <div className="flex h-48 items-center justify-center text-slate-400 text-xs">暂无数据</div>;
    const dimensions = dsl.cubeQuery.dimensions || [];
    const measures = dsl.cubeQuery.measures || [];
    const columns = [...dimensions, ...measures];
    const xKey = 'x'; 
    const yKey = measures[0];

    switch (dsl.type) {
      case 'table':
        return (
          <div className="overflow-x-auto w-full border border-slate-100 rounded-lg max-h-64 scrollbar-thin scrollbar-thumb-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                      {col.split('.').pop()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30">
                    {columns.map((col, j) => {
                      const dimIdx = dimensions.indexOf(col);
                      const value = dimensions.includes(col) 
                        ? (row[col] ?? (dimIdx === 0 ? row['x'] : null) ?? row['xValues']?.[dimIdx] ?? '-')
                        : (row[col] ?? row[col.split('.').pop()] ?? '-');
                      return (
                        <td key={j} className="px-3 py-2 text-[11px] text-slate-600 truncate max-w-[150px]">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
              <Bar dataKey={yKey} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <ReLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie data={data} nameKey={xKey} dataKey={yKey} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'kpi':
        const val = data.length > 0 ? (data[0][measures[0]] ?? data[0][measures[0].split('.').pop()] ?? 0) : 0;
        return (
          <div className="flex flex-col items-center justify-center h-40">
            <div className="text-4xl font-black text-indigo-600 tabular-nums">{Number(val).toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{measures[0].split('.').pop()}</div>
          </div>
        );
      default:
        return <div className="p-4 text-center text-slate-400 text-xs">不支持图表类型</div>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md">
      <div className="p-4 border-b border-slate-50 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            {dsl.title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{dsl.description}</p>
        </div>
      </div>
      <div className="p-4 flex-1 min-h-[220px]">{loading ? <div className="h-40 flex items-center justify-center animate-pulse text-xs text-slate-300">加载中...</div> : renderChart()}</div>
      <div className="bg-slate-50/80 p-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-1 text-[9px] text-indigo-500 font-semibold italic">
          <BrainCircuit size={12} />
          AI 校验已适配
        </div>
        <button onClick={() => setShowDSL(!showDSL)} className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded">
          {showDSL ? '隐藏调试' : '核查数据'}
        </button>
      </div>
      {showDSL && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-2 mb-2">
               <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded uppercase">Protocol</span>
               <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">Runtime Data</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <pre className="p-3 bg-slate-900 text-emerald-400 text-[9px] rounded-lg overflow-x-auto font-mono shadow-inner leading-relaxed max-h-40 scrollbar-thin scrollbar-thumb-slate-700">
                <div className="text-slate-500 mb-1 font-bold border-b border-slate-800 pb-1 underline">DSL 配置:</div>
                {JSON.stringify(dsl, null, 2)}
              </pre>
              <pre className="p-3 bg-slate-900 text-amber-400 text-[9px] rounded-lg overflow-x-auto font-mono shadow-inner leading-relaxed max-h-40 scrollbar-thin scrollbar-thumb-slate-700 border-l-2 border-amber-500">
                <div className="text-slate-500 mb-1 font-bold border-b border-slate-800 pb-1 underline">接口返回样本 (First Row):</div>
                {data.length > 0 ? JSON.stringify(data[0], null, 2) : "No data available"}
              </pre>
            </div>
          </div>
        )}
    </div>
  );
};

// ==========================================
// 3. 主应用 (App) - 增强移动端适配
// ==========================================
export default function App() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: '您好！我是您的 Agent 分析助手。请输入需求（如：产品分类统计销售额，table格式）' }
  ]);

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return;
    const userQuery = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsAnalyzing(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch('http://172.21.56.115:8000/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userQuery })
      });
      if (!response.ok) throw new Error('API连接失败');
      const result = await response.json();
      if (result.status === 'success') {
        setWidgets(prev => [result.data, ...prev]);
        setChatHistory(prev => [...prev, { role: 'ai', content: `已生成：${result.data.title}` }]);
      }
    } catch (err) {
      // 模拟 fallback
      setTimeout(() => {
        const mockDSL = {
          id: Date.now().toString(),
          type: userQuery.includes('table') ? 'table' : 'bar',
          title: `预测: ${userQuery.substring(0, 10)}`,
          description: "后端连接失败，展示模拟预览。",
          cubeQuery: { measures: ["Orders.totalAmount"], dimensions: ["Products.category"] }
        };
        setWidgets(prev => [mockDSL, ...prev]);
        setChatHistory(prev => [...prev, { role: 'ai', content: `[提示] 正在使用模拟数据展示。` }]);
      }, 800);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* 1. 移动端顶部状态栏 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Zap className="text-indigo-600" size={20} />
          <span className="font-bold text-sm">Agentic BI</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 bg-slate-50 rounded-lg">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 2. 侧边栏 (Drawer 逻辑) */}
      <div className={`
        fixed inset-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
        w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-100 hidden lg:flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Zap size={20} /></div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">Agentic BI</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-20 lg:pt-4 space-y-4">
          {chatHistory.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 text-[11px] rounded-2xl shadow-sm max-w-[85%] ${
                m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isAnalyzing && <div className="animate-pulse text-[10px] text-indigo-400 px-2 italic">Agent 思考中...</div>}
        </div>
        
        {/* 输入框关键修复：字体设为 16px 防止 iOS 缩放，视觉上通过缩放适配 */}
        <div className="p-4 border-t border-slate-100 bg-white pb-8 lg:pb-4">
          <div className="relative group">
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="输入查询指令..."
              style={{ fontSize: '16px' }} // 强制 16px 解决聚焦缩放
              className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none placeholder:text-slate-400 lg:text-xs" 
            />
            <button 
              onClick={handleSend} 
              disabled={isAnalyzing}
              className="absolute bottom-4 right-4 text-indigo-600 hover:text-indigo-800 disabled:opacity-30"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 主展示区 */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-12 pt-20 lg:pt-12 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-end mb-6 lg:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">Semantic Layer</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight tracking-tight">分析工作台</h2>
            </div>
          </div>

          {widgets.length === 0 ? (
            <div className="h-[50vh] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 bg-white/50">
              <LayoutDashboard size={40} className="mb-2 opacity-20" />
              <p className="text-xs font-medium">请在侧边栏输入指令生成报表</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 pb-10">
              {widgets.map((w) => <DynamicWidget key={w.id} dsl={w} />)}
            </div>
          )}
        </div>
      </div>

      {/* 4. 移动端背景遮罩 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}