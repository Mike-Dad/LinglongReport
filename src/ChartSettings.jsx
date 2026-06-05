import React from 'react';
import { X, Settings2, BarChart3, LineChart, PieChart, Check } from 'lucide-react';

const ChartTypeSelector = ({ chartType, onChange }) => {
  const types = [
    { type: 'bar', icon: BarChart3, label: '柱状图' },
    { type: 'line', icon: LineChart, label: '折线图' },
    { type: 'pie', icon: PieChart, label: '饼图' },
  ];

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">图表类型</span>
      <div className="grid grid-cols-3 gap-1.5">
        {types.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${
              chartType === type
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const XAxisPicker = ({ selectedDims, value, onChange }) => (
  <div className="space-y-2">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">X 轴维度</span>
    {selectedDims.length === 0 ? (
      <p className="text-[11px] text-slate-300 italic">请先在左侧添加维度</p>
    ) : (
      <div className="space-y-1">
        {selectedDims.map(dim => (
          <label
            key={dim.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              value === dim.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <input type="radio" name="xAxis" checked={value === dim.id} onChange={() => onChange(dim.id)} className="sr-only" />
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${value === dim.id ? 'border-indigo-500' : 'border-slate-300'}`}>
              {value === dim.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </div>
            <span className="text-xs font-medium text-slate-700">{dim.name}</span>
          </label>
        ))}
      </div>
    )}
  </div>
);

const YAxisPicker = ({ selectedMets, values, chartType, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Y 轴指标</span>
      {chartType === 'pie' && values.length > 1 && (
        <span className="text-[10px] font-medium text-amber-600">仅支持一个</span>
      )}
    </div>
    {selectedMets.length === 0 ? (
      <p className="text-[11px] text-slate-300 italic">请先在左侧添加指标</p>
    ) : (
      <div className="space-y-1">
        {selectedMets.map(met => {
          const checked = values.includes(met.id);
          return (
            <label
              key={met.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                checked ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (chartType === 'pie') {
                    onChange(checked ? [] : [met.id]);
                  } else {
                    onChange(checked ? values.filter(id => id !== met.id) : [...values, met.id]);
                  }
                }}
                className="sr-only"
              />
              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                checked ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
              }`}>
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-700">{met.name}</span>
              {met.unit && <span className="text-[10px] text-slate-400 ml-auto">{met.unit}</span>}
            </label>
          );
        })}
      </div>
    )}
  </div>
);

const ChartSettings = ({
  visible,
  selectedDims,
  selectedMets,
  chartType,
  xAxisDim,
  yAxisMets,
  onChartTypeChange,
  onXAxisChange,
  onYAxisChange,
  onClose,
}) => (
  <div
    style={{ width: visible ? 280 : 0 }}
    className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out bg-white border-l border-slate-200"
  >
    <div style={{ width: 280 }} className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">图示设置</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        <ChartTypeSelector chartType={chartType} onChange={onChartTypeChange} />
        <XAxisPicker selectedDims={selectedDims} value={xAxisDim} onChange={onXAxisChange} />
        <YAxisPicker selectedMets={selectedMets} values={yAxisMets} chartType={chartType} onChange={onYAxisChange} />
      </div>
    </div>
  </div>
);

export default ChartSettings;
