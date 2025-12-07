
import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartProps } from '../types';

const LineChart: React.FC<ChartProps> = ({ data, dataKey, title, color }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="date" stroke="#cbd5e0" />
          <YAxis stroke="#cbd5e0" />
          <Tooltip
            contentStyle={{ backgroundColor: '#2d3748', borderColor: '#4a5568', borderRadius: '4px' }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#a0aec0' }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
