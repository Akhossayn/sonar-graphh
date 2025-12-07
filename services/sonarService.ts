
import { GoogleGenAI } from "@google/genai";
import { VortexState, VortexMetric, ChartPoint, MarketDef } from '../types';

// --- CONFIGURATION ---
const HISTORY_LENGTH = 50;
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';
const BYBIT_WS = 'wss://stream.bybit.com/v5/public/linear';
const PHYSICS_TICK_RATE_MS = 100; // 10Hz Physics Clock (The Heartbeat)

// --- INTERNAL TYPES ---
interface AggTrade {
  price: number;
  qty: number;
  isBuyerMaker: boolean; // true = Taker is SELLER, false = Taker is BUYER (Binance standard)
  timestamp: number;
}

interface AuxData {
  fundingRate: number;
  openInterest: number;
  liquidations: number;
  // Computed Titan Metrics
  fundingAccel: number; // Rate of change in BPS
  oidScore: number;     // Divergence score
}

// Physics State for Derivative Calculations (D2, Acceleration)
interface PhysicsState {
  prevDelta: number;
  prevVelocity: number;
  lastCalcTime: number;
}

// --- MARKET DIRECTORY SERVICE ---
export const fetchAllMarkets = async (): Promise<MarketDef[]> => {
  const markets: MarketDef[] = [];

  // 1. Fetch Binance Linear Perps (USDT)
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    const data = await res.json();
    data.symbols.forEach((s: any) => {
      if (s.status === 'TRADING' && s.quoteAsset === 'USDT') {
        markets.push({
          symbol: s.symbol,
          exchange: 'BINANCE',
          base: s.baseAsset,
          quote: s.quoteAsset
        });
      }
    });
  } catch (e) {
    console.warn("Binance fetch failed", e);
  }

  // 2. Fetch Bybit Linear Perps
  try {
    const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
    const data = await res.json();
    if (data.result && data.result.list) {
      data.result.list.forEach((s: any) => {
        if (s.quoteCoin === 'USDT' && s.status === 'Trading') {
          markets.push({
            symbol: s.symbol,
            exchange: 'BYBIT',
            base: s.baseCoin,
            quote: s.quoteCoin
          });
        }
      });
    }
  } catch (e) {
    console.warn("Bybit fetch failed", e);
  }

  return markets.sort((a, b) => a.base.localeCompare(b.base));
};

// --- STREAM DRIVER ---
class MultiExchangeStream {
  private ws: WebSocket | null = null;
  private activeMarket: MarketDef = { symbol: 'BTCUSDT', exchange: 'BINANCE', base: 'BTC', quote: 'USDT' };
  private subscribers: ((state: VortexState) => void)[] = [];
  
  // Buffers
  private priceHistory: ChartPoint[] = [];
  private tradeBuffer: AggTrade[] = []; // Rolling 60s window
  private lastPrice: number = 0;
  
  // State for Calculus (Derivatives)
  private physics: PhysicsState = {
    prevDelta: 0,
    prevVelocity: 0,
    lastCalcTime: 0
  };
  
  // Aux Data
  private auxData: AuxData = { 
    fundingRate: 0, 
    openInterest: 0, 
    liquidations: 0,
    fundingAccel: 0,
    oidScore: 0
  };
  
  private prevAuxFetchTime: number = 0;
  private prevPriceAtAuxFetch: number = 0;
  private auxInterval: any = null;
  private physicsInterval: any = null;

  constructor() {
    this.initHistory();
  }

  private initHistory() {
    this.priceHistory = [];
    const now = Date.now();
    for(let i=HISTORY_LENGTH; i>0; i--) {
      this.priceHistory.push({ date: new Date(now - i*1000).toLocaleTimeString(), value: 0 });
    }
  }

  public connect(market: MarketDef) {
    if (this.ws) {
        this.ws.close();
        this.ws = null;
    }
    if (this.auxInterval) clearInterval(this.auxInterval);
    if (this.physicsInterval) clearInterval(this.physicsInterval);
    
    // Reset if switching pairs
    if (market.symbol !== this.activeMarket.symbol || market.exchange !== this.activeMarket.exchange) {
      this.initHistory();
      this.tradeBuffer = [];
      this.lastPrice = 0;
      this.auxData = { fundingRate: 0, openInterest: 0, liquidations: 0, fundingAccel: 0, oidScore: 0 };
      this.physics = { prevDelta: 0, prevVelocity: 0, lastCalcTime: 0 };
      this.prevAuxFetchTime = 0;
      this.prevPriceAtAuxFetch = 0;
    }
    
    this.activeMarket = market;

    if (market.exchange === 'BINANCE') {
      this.connectBinance(market.symbol);
    } else if (market.exchange === 'BYBIT') {
      this.connectBybit(market.symbol);
    }

    // Start Fetching Data
    this.fetchAuxilliaryData();
    this.auxInterval = setInterval(() => this.fetchAuxilliaryData(), 10000); // Poll every 10s
    
    // Start Physics Engine (The Heartbeat)
    this.physicsInterval = setInterval(() => this.calculatePhysics(), PHYSICS_TICK_RATE_MS);
  }

  private async fetchAuxilliaryData() {
    if (this.activeMarket.exchange === 'BINANCE') {
      try {
        const [fundRes, oiRes] = await Promise.all([
             fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${this.activeMarket.symbol}`),
             fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${this.activeMarket.symbol}`)
        ]);
        const fundData = await fundRes.json();
        const oiData = await oiRes.json();
        
        const newFunding = parseFloat(fundData.lastFundingRate || '0');
        const newOI = parseFloat(oiData.openInterest || '0');
        const now = Date.now();

        // --- TITAN CALCULATIONS ---
        
        // 1. Funding Acceleration (Change in Basis Points)
        if (this.prevAuxFetchTime > 0) {
            const fundingDelta = newFunding - this.auxData.fundingRate;
            // Convert to Basis Points (x10000)
            this.auxData.fundingAccel = fundingDelta * 10000; 
        }

        // 2. OID Divergence
        // Logic: (OI % Change) - (Price % Change)
        if (this.prevPriceAtAuxFetch > 0 && this.auxData.openInterest > 0) {
            const oiDeltaPct = (newOI - this.auxData.openInterest) / this.auxData.openInterest;
            const priceDeltaPct = (this.lastPrice - this.prevPriceAtAuxFetch) / this.prevPriceAtAuxFetch;
            
            // Normalize scale (x100 for percentage points difference)
            this.auxData.oidScore = (oiDeltaPct - priceDeltaPct) * 100; 
        }

        // Update State
        this.auxData.fundingRate = newFunding;
        this.auxData.openInterest = newOI;
        this.prevAuxFetchTime = now;
        this.prevPriceAtAuxFetch = this.lastPrice;

      } catch (e) {
        // Silent fail
      }
    }
  }

  private connectBinance(symbol: string) {
    const streams = `${symbol.toLowerCase()}@aggTrade/${symbol.toLowerCase()}@forceOrder`;
    this.ws = new WebSocket(`${BINANCE_WS}/${streams}`);
    
    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.e === 'aggTrade') {
        this.processTrade({
          price: parseFloat(data.p),
          qty: parseFloat(data.q),
          isBuyerMaker: data.m,
          timestamp: data.T
        });
      } else if (data.e === 'forceOrder') {
        const liqQty = parseFloat(data.o.q);
        const liqPrice = parseFloat(data.o.p);
        this.auxData.liquidations += (liqQty * liqPrice);
      }
    };
  }

  private connectBybit(symbol: string) {
    this.ws = new WebSocket(BYBIT_WS);
    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ op: "subscribe", args: [`publicTrade.${symbol}`, `liquidation.${symbol}`] }));
    };
    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.topic && data.topic.startsWith('publicTrade') && data.data) {
        data.data.forEach((t: any) => {
          this.processTrade({
            price: parseFloat(t.p),
            qty: parseFloat(t.v),
            isBuyerMaker: t.S === 'Sell', 
            timestamp: t.T
          });
        });
      } else if (data.topic && data.topic.startsWith('liquidation') && data.data) {
          // Bybit liquidation handling
          const liq = data.data;
          const val = parseFloat(liq.price) * parseFloat(liq.size);
          this.auxData.liquidations += val;
      }
    };
    setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ op: "ping" }));
    }, 20000);
  }

  public subscribe(cb: (state: VortexState) => void) {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(s => s !== cb); };
  }

  // FAST INGESTION (No Calculation)
  private processTrade(trade: AggTrade) {
    this.lastPrice = trade.price;
    this.tradeBuffer.push(trade);
    
    // Pruning
    const now = Date.now();
    const cutoff = now - 60000; // 60 Second Rolling Window
    
    // Optimization: Only prune if buffer gets too large to save cycles on hot path
    if (this.tradeBuffer.length > 5000) {
        const idx = this.tradeBuffer.findIndex(t => t.timestamp >= cutoff);
        if (idx > 0) this.tradeBuffer = this.tradeBuffer.slice(idx);
    }
  }

  // PHYSICS TICK (Fixed Frequency)
  private calculatePhysics() {
    if (this.tradeBuffer.length === 0 && this.lastPrice === 0) return;
    
    const buffer = this.tradeBuffer;
    
    // Update Chart History (On tick, not on trade)
    const now = Date.now();
    const timeString = new Date(now).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    const lastPt = this.priceHistory[this.priceHistory.length - 1];
    
    // CRITICAL FIX: Do not mutate read-only property 'value' of the object in the array.
    // Instead, replace the object at the index with a new one.
    if (lastPt && lastPt.date === timeString) {
      this.priceHistory[this.priceHistory.length - 1] = {
        date: timeString,
        value: this.lastPrice
      };
    } else {
      this.priceHistory.push({ date: timeString, value: this.lastPrice });
      if (this.priceHistory.length > HISTORY_LENGTH) this.priceHistory.shift();
    }

    // --- PHYSICS ENGINE CALCULATIONS ---
    
    let buyVol = 0;
    let sellVol = 0;
    let buyCount = 0;
    let sellCount = 0;
    
    // 1. Calculate Base Mass (Volume)
    // Filter buffer for strictly last 60s window for accuracy
    const cutoff = now - 60000;
    const activeTrades = buffer.filter(t => t.timestamp >= cutoff);
    
    activeTrades.forEach(t => {
      if (t.isBuyerMaker) {
        sellVol += t.qty; 
        sellCount++;
      } else {
        buyVol += t.qty; 
        buyCount++;
      }
    });

    const currentDelta = buyVol - sellVol; // Net Flow
    const deltaUSD = currentDelta * this.lastPrice;
    const totalVolUSD = (buyVol + sellVol) * this.lastPrice;
    const velocity = activeTrades.length; // Frequency of trades per min

    // 2. TAKER DELTA D2 (MOMENTUM / ACCELERATION)
    // Formula: Current Delta - Previous Delta (from last TICK, not last TRADE)
    const deltaAccel = currentDelta - this.physics.prevDelta; 
    
    // Update physics state for next tick
    this.physics.prevDelta = currentDelta;

    // 3. WHALE ABSORPTION (ICEBERG PHYSICS)
    // Formula: VolumeUSD / PriceDisplacement
    const prices = activeTrades.map(t => t.price);
    const minP = prices.length ? Math.min(...prices) : this.lastPrice;
    const maxP = prices.length ? Math.max(...prices) : this.lastPrice;
    const priceRange = maxP - minP;
    const rangePct = this.lastPrice > 0 ? priceRange / this.lastPrice : 0;
    
    // We add a tiny epsilon to prevent division by zero in flat markets
    const absorptionRatio = (totalVolUSD / 100000) / (Math.max(rangePct, 0.00001) * 10000); 
    const absorptionScore = Math.min(100, absorptionRatio);

    // 4. LIQUIDITY FRACTAL DENSITY
    const density = rangePct === 0 ? 100 : (totalVolUSD / priceRange);
    const densityMetric = density > 1000000 ? "DIAMOND" : density > 100000 ? "CONCRETE" : "AIR";

    // 5. CVD DIVERGENCE (TRUTH DETECTOR)
    const priceChange = prices.length > 0 ? prices[prices.length - 1] - prices[0] : 0;
    let cvdDivLabel = 'SYNCED';
    let cvdColor: 'gray'|'red'|'green'|'pink' = 'gray';

    if (priceChange > 0 && currentDelta < 0) {
        cvdDivLabel = 'BEARISH DIV'; // Price Up, Selling Pressure
        cvdColor = 'pink';
    } else if (priceChange < 0 && currentDelta > 0) {
        cvdDivLabel = 'BULLISH DIV'; // Price Down, Buying Pressure
        cvdColor = 'green';
    }

    // 6. SENTIMENT SKEW (Aggressor Ratio)
    const skew = buyCount > 0 && sellCount > 0 ? (buyCount / sellCount).toFixed(2) : '1.0';

    // Liquidation Tape Decay (Visual Effect)
    this.auxData.liquidations *= 0.99; 

    // 7. VCS SCORE (COMPOSITE)
    const vcsRaw = (deltaAccel * 0.5) + (velocity * 0.2) - (this.auxData.fundingAccel * 2000);
    const vcsScore = Math.min(100, Math.abs(vcsRaw / 10)).toFixed(1);
    let vcsStatus = "NEUTRAL";
    if (vcsRaw > 100) vcsStatus = "MOMENTUM BURST";
    else if (vcsRaw < -100) vcsStatus = "FLASH DUMP";
    else if (Math.abs(currentDelta) > 0 && Math.abs(priceChange) === 0) vcsStatus = "COILING";

    // 8. EJECTION POWER
    const ejectionRaw = absorptionScore + Math.abs(this.auxData.oidScore * 20);
    const ejectionPower = Math.min(100, ejectionRaw).toFixed(1);
    const ejectionStatus = parseFloat(ejectionPower) > 80 ? "CRITICAL STRESS" : "BUILDING";

    const metrics: VortexMetric[] = [
      {
        id: 1,
        label: '1. TAKER D2 (ACCEL)',
        value: deltaAccel > 0 ? `+${(deltaAccel).toFixed(2)}` : `${(deltaAccel).toFixed(2)}`,
        subValue: "MOMENTUM",
        statusLabel: deltaAccel > 100 ? 'SURGE' : deltaAccel < -100 ? 'CRASH' : 'DRIFT',
        statusColor: deltaAccel > 0 ? 'green' : 'red',
        isHighlighted: Math.abs(deltaAccel) > 500,
      },
      {
        id: 2,
        label: '2. LIQ TAPE (USD)',
        value: `$${Math.floor(this.auxData.liquidations)}`,
        statusLabel: this.auxData.liquidations > 10000 ? 'CASCADE' : 'QUIET',
        statusColor: this.auxData.liquidations > 10000 ? 'red' : 'gray',
      },
      {
        id: 3,
        label: '3. WHALE ABSORPTION',
        value: `${absorptionScore.toFixed(1)}`,
        statusLabel: absorptionScore > 80 ? 'ICEBERG' : 'CLEAR',
        statusColor: absorptionScore > 80 ? 'blue' : 'gray',
      },
      {
        id: 4,
        label: '4. FUNDING ACCEL',
        value: this.auxData.fundingAccel.toFixed(4),
        statusLabel: Math.abs(this.auxData.fundingAccel) > 0.01 ? 'UNSTABLE' : 'STABLE',
        statusColor: this.auxData.fundingAccel > 0.01 ? 'pink' : 'gray',
      },
      {
        id: 5,
        label: '5. CVD DIVERGENCE',
        value: cvdDivLabel,
        statusLabel: cvdDivLabel === 'SYNCED' ? 'TRUTH' : 'ANOMALY',
        statusColor: cvdColor,
        isHighlighted: cvdDivLabel !== 'SYNCED',
      },
      {
        id: 6,
        label: '6. EXEC VELOCITY',
        value: `${velocity}/m`,
        statusLabel: velocity > 1000 ? 'HFT WAR' : 'RETAIL',
        statusColor: 'gray',
      },
      {
        id: 7,
        label: '7. ORDER SKEW',
        value: `${skew}x`,
        statusLabel: parseFloat(skew) > 2.0 ? 'BUY IMBALANCE' : parseFloat(skew) < 0.5 ? 'SELL IMBALANCE' : 'BALANCED',
        statusColor: 'gray',
      },
      {
        id: 8,
        label: '8. OID DIVERGENCE',
        value: this.auxData.oidScore.toFixed(2),
        statusLabel: Math.abs(this.auxData.oidScore) > 2 ? 'LEVERAGE DIV' : 'HEALTHY',
        statusColor: this.auxData.oidScore < -2 ? 'red' : 'gray',
        isHighlighted: true,
      },
      {
        id: 9,
        label: '9. LIQUIDITY DENSITY',
        value: densityMetric,
        statusLabel: 'TEXTURE',
        statusColor: 'gray',
        isHighlighted: true,
      },
      {
        id: 10,
        label: '10. NET DELTA (60s)',
        value: (currentDelta * this.lastPrice / 1000).toFixed(1) + 'k',
        statusLabel: 'FLOW',
        statusColor: currentDelta > 0 ? 'green' : 'red',
      },
      {
        id: 11,
        label: '11. VOLATILITY (RANGE)',
        value: (rangePct * 100).toFixed(3) + '%',
        statusLabel: 'EXPANSION',
        statusColor: 'gray',
      },
      {
        id: 12,
        label: '12. MARKET PRICE',
        value: this.lastPrice.toFixed(2),
        statusLabel: 'LIVE',
        statusColor: 'gray',
      },
    ];

    const state: VortexState = {
      market: this.activeMarket,
      price: this.lastPrice,
      lagMs: Date.now() - activeTrades[activeTrades.length-1]?.timestamp || 0,
      vcsScore: parseFloat(vcsScore),
      vcsStatus,
      ejectionPower: parseFloat(ejectionPower),
      ejectionStatus,
      metrics,
      history: [...this.priceHistory]
    };

    this.subscribers.forEach(cb => cb(state));
  }
}

export const vortexStream = new MultiExchangeStream();

export const fetchAIAnalysis = async (state: VortexState): Promise<string> => {
  if (state.price === 0) return "WAITING FOR MARKET DATA...";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are the Titan Logic Engine. 
      Analyze this raw physics data. NO FLUFF. PURE ALPHA.
      
      Market: ${state.market.symbol}
      Taker D2 (Momentum Accel): ${state.metrics[0].value}
      Whale Absorption (Iceberg): ${state.metrics[2].value}
      Liquidity Density: ${state.metrics[8].value}
      Funding Accel: ${state.metrics[3].value}
      OID Divergence: ${state.metrics[7].value}
      
      Task: Identify the ONE critical anomaly or truth. Is price lying? Is leverage building?
      Output: 1 sentence. Cyberpunk military style. Warning or Confirmation only.`,
    });
    return response.text.trim();
  } catch (e) {
    return "AI UPLINK SEVERED";
  }
};
