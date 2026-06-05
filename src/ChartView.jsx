import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { BarChart3, AlertCircle } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const formatValue = (value, unit) => {
  if (typeof value !== 'number') return value;
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 1 });
};

const tooltipStyle = {
  borderRadius: '8px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '12px',
};

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
    <div className="w-20 h-20 rounded-[2rem] bg-slate-100 flex items-center justify-center">
      <Icon className="w-10 h-10 text-slate-300" />
    </div>
    <p className="text-xs font-bold max-w-xs text-center leading-relaxed">{text}</p>
  </div>
);

const ChartView = ({ chartType, data, xKey, yKeys, hasGenerated, height = 400 }) => {
  if (!hasGenerated || data.length === 0) {
    return <EmptyState icon={BarChart3} text="请先点击「执行查询」生成数据" />;
  }

  if (!xKey) {
    return <EmptyState icon={AlertCircle} text="请在图示设置中选择 X 轴维度" />;
  }

  if (yKeys.length === 0) {
    return <EmptyState icon={AlertCircle} text="请在图示设置中选择 Y 轴指标" />;
  }

  const xItem = xKey;
  const pieNote = chartType === 'pie' && yKeys.length > 1;

  const commonAxisProps = {
    axisLine: { stroke: '#cbd5e1', strokeWidth: 1 },
    tickLine: { stroke: '#cbd5e1' },
    tick: { fontSize: 11, fill: '#475569' },
  };

  const renderTooltip = (metList) => (
    <Tooltip
      cursor={{ fill: '#f8fafc' }}
      contentStyle={tooltipStyle}
      formatter={(value, name) => {
        const met = metList.find(m => m.name === name || m.id === name);
        return [formatValue(value, met?.unit), name];
      }}
    />
  );

  if (chartType === 'pie') {
    const met = yKeys[0];
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {pieNote && (
          <div className="shrink-0 mx-6 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-medium text-amber-700 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            饼图仅支持单个指标，已自动选择「{met.name}」
          </div>
        )}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={height}>
            <RePieChart>
              <Pie
                data={data}
                nameKey={xKey}
                dataKey={met.id}
                name={met.name}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              {renderTooltip(yKeys)}
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'line' ? (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={xItem} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {renderTooltip(yKeys)}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {yKeys.map((met, idx) => (
              <Line
                key={met.id}
                type="monotone"
                dataKey={met.id}
                name={met.name}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={xItem} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {renderTooltip(yKeys)}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {yKeys.map((met, idx) => (
              <Bar
                key={met.id}
                dataKey={met.id}
                name={met.name}
                fill={COLORS[idx % COLORS.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartView;
