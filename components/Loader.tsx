
import React from 'react';

const Loader: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-12 h-12 border-4 border-indigo-500 border-dashed rounded-full animate-spin"></div>
    <p className="ml-4 text-lg text-indigo-300">Loading data...</p>
  </div>
);

export default Loader;
