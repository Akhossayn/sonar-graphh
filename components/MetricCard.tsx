
import React from 'react';
import { VortexMetric } from '../types';

interface MetricCardProps {
  metric: VortexMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const borderColor = metric.isHighlighted ? 'border-[#d500f9]' : 'border-gray-700';
  const labelColor = metric.isHighlighted ? 'text-[#d500f9]' : 'text-gray-400';
  
  // Map status colors to Tailwind classes
  const statusBgMap = {
    gray: 'bg-gray-700 text-white',
    green: 'bg-green-900 border border-green-500 text-green-400',
    red: 'bg-red-900 border border-red-500 text-red-400',
    pink: 'bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-400',
    blue: 'bg-blue-900 border border-blue-500 text-blue-400',
  };

  const statusClass = statusBgMap[metric.statusColor] || statusBgMap.gray;

  return (
    <div className={`bg-black border ${borderColor} p-4 rounded flex flex-col justify-between h-32 relative shadow-lg`}>
      {/* Label */}
      <h4 className={`text-xs font-mono font-bold uppercase mb-2 ${labelColor}`}>
        {metric.label}
      </h4>

      {/* Value */}
      <div className="text-2xl font-mono font-bold text-gray-100 tracking-wider">
        {metric.value}
      </div>

      {/* Status Badge */}
      <div className="mt-auto">
        <span className={`inline-block px-2 py-1 text-[10px] font-mono font-bold uppercase rounded ${statusClass}`}>
          {metric.statusLabel}
        </span>
      </div>
    </div>
  );
};

export default MetricCard;
