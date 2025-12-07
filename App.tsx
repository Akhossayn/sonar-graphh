
import React, { useState, useEffect, useRef } from 'react';
import { VortexState, MarketDef } from './types';
import { vortexStream, fetchAIAnalysis, fetchAllMarkets } from './services/sonarService';
import MetricCard from './components/MetricCard';
import LineChart from './components/LineChart';

const App: React.FC = () => {
  // Defaults
  const [activeMarket, setActiveMarket] = useState<MarketDef>({ symbol: 'BTCUSDT', exchange: 'BINANCE', base: 'BTC', quote: 'USDT' });
  const [watchlist, setWatchlist] = useState<MarketDef[]>([
    { symbol: 'BTCUSDT', exchange: 'BINANCE', base: 'BTC', quote: 'USDT' },
    { symbol: 'ETHUSDT', exchange: 'BINANCE', base: 'ETH', quote: 'USDT' },
    { symbol: 'SOLUSDT', exchange: 'BYBIT', base: 'SOL', quote: 'USDT' },
    { symbol: 'WIFUSDT', exchange: 'BYBIT', base: 'WIF', quote: 'USDT' }
  ]);
  
  const [allMarkets, setAllMarkets] = useState<MarketDef[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [data, setData] = useState<VortexState | null>(null);
  const [aiText, setAiText] = useState<string>("INITIALIZING AGGR UPLINK...");
  const lastAiFetchRef = useRef<number>(0);

  // Load Market Directory
  useEffect(() => {
    fetchAllMarkets().then(setAllMarkets);
  }, []);

  // Connect to Stream
  useEffect(() => {
    // Clear data when switching to show loading state
    setData(null);
    vortexStream.connect(activeMarket);
    const sub = vortexStream.subscribe(setData);
    return () => sub();
  }, [activeMarket]);

  // AI Logic
  useEffect(() => {
    if (data && data.price > 0 && Date.now() - lastAiFetchRef.current > 15000) {
      lastAiFetchRef.current = Date.now();
      setAiText("SCANNING MEMPOOL...");
      fetchAIAnalysis(data).then(setAiText);
    }
  }, [data]);

  const handleSelectMarket = (m: MarketDef) => {
    // Add to watchlist if not exists
    if (!watchlist.find(w => w.symbol === m.symbol && w.exchange === m.exchange)) {
      setWatchlist([...watchlist, m]);
    }
    setActiveMarket(m);
    setIsSearching(false);
    setSearchQuery('');
  };

  const filteredMarkets = allMarkets
    .filter(m => m.base.includes(searchQuery.toUpperCase()) || m.symbol.includes(searchQuery.toUpperCase()))
    .slice(0, 15);

  if (!data) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-[#d500f9] animate-pulse text-xl mb-4">CONNECTING TO {activeMarket.exchange}...</div>
        <div className="text-gray-500 text-xs">ESTABLISHING WEBSOCKET FEED FOR {activeMarket.symbol}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 font-mono flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-gray-800 bg-black flex flex-col z-20 hidden md:flex">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-[#d500f9] font-bold tracking-widest text-lg hidden md:block">AGGR.SONAR</h2>
          <span className="text-[#d500f9] font-bold md:hidden">S</span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {watchlist.map((m) => (
            <button
              key={`${m.exchange}:${m.symbol}`}
              onClick={() => setActiveMarket(m)}
              className={`w-full text-left p-3 hover:bg-gray-900 border-l-4 transition-all ${
                activeMarket.symbol === m.symbol && activeMarket.exchange === m.exchange
                  ? 'border-[#d500f9] bg-gray-900' 
                  : 'border-transparent text-gray-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">{m.base}</span>
                <span className="text-[10px] bg-gray-800 px-1 rounded text-gray-400">{m.exchange.substr(0,3)}</span>
              </div>
              <div className="text-[10px] text-gray-600 hidden md:block">{m.symbol}</div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 relative">
          {!isSearching ? (
             <button 
               onClick={() => setIsSearching(true)}
               className="w-full bg-gray-900 border border-gray-700 text-gray-400 py-2 rounded text-xs font-bold hover:border-[#d500f9] hover:text-[#d500f9]"
             >
               + ADD PAIR
             </button>
          ) : (
            <div>
              <input 
                autoFocus
                type="text" 
                placeholder="BTC, ETH, PEPE..." 
                className="w-full bg-gray-900 border border-[#d500f9] text-white text-xs p-2 rounded outline-none uppercase"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setIsSearching(false), 200)}
              />
              {/* Dropdown */}
              {searchQuery && (
                <div className="absolute bottom-full left-0 w-64 bg-gray-900 border border-gray-700 max-h-60 overflow-y-auto shadow-xl mb-2 z-50">
                  {filteredMarkets.map((m, i) => (
                    <div 
                      key={i}
                      className="p-2 border-b border-gray-800 hover:bg-[#d500f9] hover:text-black cursor-pointer flex justify-between items-center group"
                      onMouseDown={() => handleSelectMarket(m)}
                    >
                      <span className="font-bold text-xs">{m.base}</span>
                      <span className="text-[10px] text-gray-500 group-hover:text-black">{m.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b-2 border-[#d500f9] pb-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2">
              <span className="text-[#d500f9]">{activeMarket.base}</span>
              <span className="text-gray-600 text-lg">/</span>
              <span className="text-gray-400 text-lg">{activeMarket.quote}</span>
            </h1>
            <span className="text-xs text-gray-500 font-bold tracking-widest">{activeMarket.exchange} AGGREGATION STREAM</span>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <div className="text-right">
              <div className="text-4xl font-bold text-[#00e676] tabular-nums">
                {data.price.toFixed(data.price < 10 ? 4 : 2)}
              </div>
            </div>
          </div>
        </header>

        {/* AI Bar */}
        <div className="mb-6 border-l-4 border-[#d500f9] bg-gray-900/40 p-3 relative">
          <div className="absolute top-0 right-0 bg-[#d500f9] text-black text-[9px] font-bold px-1">AI ORACLE</div>
          <p className="text-[#d500f9] font-mono text-sm animate-pulse">{">"} {aiText}</p>
        </div>

        {/* Top Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 h-[200px] lg:h-[240px]">
          {/* VCS Gauge */}
          <div className="bg-gray-900/80 border border-gray-700 p-4 rounded flex flex-col items-center justify-center relative">
             <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] absolute top-4">Vortex Composite</span>
             <span className="text-5xl font-bold text-white mb-2">{data.vcsScore}</span>
             <span className={`text-xs px-2 py-1 rounded font-bold ${data.vcsStatus.includes('BULL') ? 'bg-green-900 text-green-400' : data.vcsStatus.includes('BEAR') ? 'bg-red-900 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
               {data.vcsStatus}
             </span>
          </div>

          {/* Chart */}
          <div className="col-span-1 lg:col-span-2 bg-gray-900/80 border border-gray-700 rounded overflow-hidden p-2">
             <LineChart data={data.history} dataKey="value" title="" color="#00e676" />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.metrics.map(m => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>
      </main>
    </div>
  );
};
export default App;
