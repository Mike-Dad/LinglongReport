import React, { useState, useEffect } from 'react';
import cubejs from '@cubejs-client/core';
import { 
  Send, Zap, LayoutDashboard, Database, AlertCircle, 
  BarChart3, LineChart, PieChart, TrendingUp, Table, Code, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// ==========================================
// 1. 初始化 Cube.js 客户端 (使用 Mock 替代真实依赖以支持在线预览)
// ==========================================
// 请将此处替换为你的真实 Cube.js Token 和 API 地址
const cubejsApi = cubejs('myapisecret', {
  apiUrl: 'http://localhost:4000/cubejs-api/v1' 
});

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ==========================================
// 2. 动态报表渲染组件 (Widget Renderer)
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
        // 调用 Cube.js 获取真实数据
        const resultSet = await cubejsApi.load(dsl.cubeQuery);
        if (isMounted) {
          // chartPivot() 返回的数据格式非常契合 Recharts 
          // 格式类似: [{ x: '分类A', 'Measures.count': 10 }, ...]
          setData(resultSet.chartPivot());
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "请求 Cube 数据失败");
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [dsl]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
        <span className="text-sm">正在聚合 Cube 数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-red-400 bg-red-50 rounded-lg">
        <AlertCircle size={32} className="mb-2" />
        <span className="text-sm font-medium">{error}</span>
      </div>
    );
  }

  // 提取图表需要的 xKey 和 yKey (假设取第一个维度和第一个指标)
  const xKey = 'x'; 
  const yKey = dsl.cubeQuery.measures[0] || 'value';

  const renderChart = () => {
    switch (dsl.type) {
      case 'table':
        return (
          <div className="overflow-x-auto w-full border border-slate-100 rounded-lg max-h-64">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map(key => (
                    <th key={key} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">
                      {key.split('.').pop()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-xs text-slate-600 truncate max-w-[120px]">
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              <Bar dataKey={yKey} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie data={data} nameKey={xKey} dataKey={yKey} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'kpi':
        const value = data.length > 0 ? data[0][yKey] : 0;
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-4xl font-bold text-slate-800">{Number(value).toLocaleString()}</div>
          </div>
        );
      default:
        return <div className="p-4 text-center text-slate-500">不支持的图表类型: {dsl.type}</div>;
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col ${dsl.type === 'line' ? 'md:col-span-2' : ''}`}>
      <div className="p-5 border-b border-slate-50 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {dsl.type === 'table' ? <Table size={16} /> : <BarChart3 size={16} />}
            {dsl.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{dsl.description}</p>
        </div>
      </div>

      <div className="p-5 flex-1 min-h-[250px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 animate-pulse text-sm">加载中...</div>
        ) : error ? (
          <div className="text-red-500 text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>
        ) : renderChart()}
      </div>

      <div className="bg-slate-50/50 p-3 border-t border-slate-100 flex flex-col">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {dsl.id.substring(0, 8)}
          </span>
          <button 
            onClick={() => setShowDSL(!showDSL)}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
          >
            <Code size={12} />
            {showDSL ? '隐藏 DSL' : '查看 DSL'}
            {showDSL ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        
        {showDSL && (
          <pre className="mt-3 p-3 bg-slate-900 text-indigo-300 text-[10px] rounded-lg overflow-x-auto font-mono leading-relaxed">
            {JSON.stringify(dsl, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. 主应用组件 (App)
// ==========================================
export default function App() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: '您好！我是 NL2BI 助手。您的 Orders, Users, Products 数据集已连接。想看点什么数据？' }
  ]);

  const handleSend = async () => {
    if (!input.trim() || isAnalyzing) return;

    const userQuery = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsAnalyzing(true);

    try {
      // 1. 调用 Python 后端进行自然语言转 DSL
      let generatedDsl;
      try {
        const response = await fetch('http://localhost:8000/api/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userQuery })
        });

        if (!response.ok) throw new Error('网络请求失败');
        
        const result = await response.json();
        
        if (result.status === 'success') {
          generatedDsl = result.data;
        } else {
          throw new Error('LLM 解析异常');
        }
      } catch (apiError) {
        // 提供预览环境的回退逻辑，以便可以在无后端的情况下体验 UI
        await new Promise(r => setTimeout(r, 1200));
        const chartTypes = ['bar', 'line', 'pie', 'kpi'];
        const randomType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
        generatedDsl = {
          id: Date.now().toString(),
          type: randomType,
          title: `演示图表: ${userQuery.substring(0, 8)}...`,
          description: "当前为在线预览模式，展示的是模拟数据与图表结构。",
          cubeQuery: { measures: ["Orders.totalAmount"], dimensions: ["Orders.status"] }
        };
      }

      // 2. 将 DSL 加入报表看板数组
      setWidgets(prev => [generatedDsl, ...prev]);
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: `已为您生成图表：“${generatedDsl.title}”。` 
      }]);

    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: `❌ 生成失败: ${error.message}` 
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* 左侧：AI 对话与指令区 */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg"><Zap className="text-white" size={20} /></div>
          <h1 className="font-bold text-xl tracking-tight">NL2BI Assistant</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isAnalyzing && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-sm text-slate-500 shadow-sm">
                 <div className="animate-pulse flex gap-1">
                   <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                   <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                   <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                 </div>
                 AI正在思考并生成协议...
               </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="例如：按产品分类统计总销售额..."
              className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24"
            />
            <button 
              onClick={handleSend}
              disabled={isAnalyzing}
              className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 flex justify-between items-center">
             <div className="text-[10px] text-slate-400 flex items-center gap-1">
               <Database size={10} className="text-emerald-500" /> PostgreSQL & Cube已连接
             </div>
          </div>
        </div>
      </div>

      {/* 右侧：动态报表预览区 */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <LayoutDashboard className="text-indigo-600" /> AI 生成看板
              </h2>
              <p className="text-slate-500 text-sm mt-1">完全基于语义层 DSL 动态渲染</p>
            </div>
          </div>

          {widgets.length === 0 ? (
            <div className="h-[60vh] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 space-y-4">
              <BarChart3 size={48} className="text-slate-300" opacity={0.5} />
              <p className="font-medium text-slate-500">发送自然语言指令以生成图表</p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-100 rounded">"统计各国家用户数量"</span>
                <span className="px-2 py-1 bg-slate-100 rounded">"按月看订单金额趋势"</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {widgets.map((dsl, idx) => (
                <DynamicWidget key={`${dsl.id}-${idx}`} dsl={dsl} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}