
import { GoogleGenAI } from "@google/genai";
import { VortexState, VortexMetric, ChartPoint } from '../types';

// Module-level state to simulate continuity and calculations over time
let lastPrice = 91430.20;
let lastCVD = 1000;
let lastFunding = 0.01;
let lastTimestamp = Date.now();
let priceHistory: ChartPoint[] = [];

// Initialize history with some dummy data
const now = new Date();
for (let i = 20; i >= 0; i--) {
  const t = new Date(now.getTime() - i * 1000);
  priceHistory.push({
    date: t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
    value: parseFloat((lastPrice + (Math.random() - 0.5) * 100).toFixed(2))
  });
}

/**
 * Simulates pulling data from Sonar Core Fast API and performing real-time calculations.
 */
export const fetchVortexData = async (): Promise<VortexState> => {
  return new Promise((resolve) => {
    // Simulate network latency (randomized to look organic)
    const latency = Math.floor(Math.random() * 200) + 50; 

    setTimeout(() => {
      const nowMs = Date.now();
      const timeDelta = (nowMs - lastTimestamp) / 1000; // Seconds since last fetch
      lastTimestamp = nowMs;

      // 1. Simulating Price Movement (Random Walk)
      const priceChange = (Math.random() - 0.5) * 50;
      const currentPrice = lastPrice + priceChange;
      lastPrice = currentPrice;

      // Update History
      const timeString = new Date(nowMs).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      priceHistory.push({ date: timeString, value: parseFloat(currentPrice.toFixed(2)) });
      if (priceHistory.length > 30) priceHistory.shift();

      // 2. Calculating Taker Delta (Simulated Volume Flow)
      // If price goes up, bias delta positive, else negative
      const flowBias = priceChange > 0 ? 1 : -1;
      const takerDelta = Math.floor((Math.random() * 100 * flowBias) + (Math.random() * 20));

      // 3. Calculating CVD Velocity (Change in Volume / Time)
      const currentCVD = lastCVD + takerDelta;
      const velocity = ((currentCVD - lastCVD) / (timeDelta || 1)).toFixed(1);
      lastCVD = currentCVD;

      // 4. Whale Absorption Calculation
      // Randomly spike absorption when price moves significantly
      const whaleAbsorption = Math.abs(priceChange) > 10 
        ? (50 + Math.random() * 40).toFixed(2) 
        : (Math.random() * 30).toFixed(2);

      // 5. Funding Rate Acceleration
      const currentFunding = lastFunding + (Math.random() - 0.5) * 0.0001;
      const fundingAccel = ((currentFunding - lastFunding) * 10000).toFixed(4);
      lastFunding = currentFunding;

      // 6. Generate Metrics List
      const metrics: VortexMetric[] = [
        {
          id: 1,
          label: '1. TAKER DELTA D2 (60s)',
          value: takerDelta > 0 ? `+${takerDelta}` : `${takerDelta}`,
          statusLabel: Math.abs(takerDelta) < 20 ? 'NEUTRAL' : takerDelta > 0 ? 'BULLISH' : 'BEARISH',
          statusColor: Math.abs(takerDelta) < 20 ? 'gray' : takerDelta > 0 ? 'green' : 'red',
        },
        {
          id: 2,
          label: '2. LIQUIDATION TAPE (60s USD)',
          value: `$${Math.floor(Math.random() * 5000)}`,
          statusLabel: Math.random() > 0.8 ? 'ACTIVE' : 'QUIET',
          statusColor: 'gray',
        },
        {
          id: 3,
          label: '3. WHALE ABSORPTION (USD %)',
          value: `${whaleAbsorption}%`,
          statusLabel: parseFloat(whaleAbsorption) > 50 ? 'HIGH ABSORP' : 'LOW ABSORP',
          statusColor: parseFloat(whaleAbsorption) > 50 ? 'green' : 'gray',
        },
        {
          id: 4,
          label: '4. FUNDING RATE ACCEL (BPS/min)',
          value: fundingAccel,
          statusLabel: Math.abs(parseFloat(fundingAccel)) > 0.005 ? 'VOLATILE' : 'CALM',
          statusColor: 'gray',
        },
        {
          id: 5,
          label: '5. CVD DIVERGENCE INDEX (CDI)',
          value: `${(Math.random() * 5).toFixed(1)}%`,
          statusLabel: 'CONFLUENCE',
          statusColor: 'gray',
          isHighlighted: true,
        },
        {
          id: 6,
          label: '6. CVD VELOCITY (Contracts/min)',
          value: `${velocity}/m`,
          statusLabel: Math.abs(parseFloat(velocity)) > 10 ? 'TURBULENT' : 'STABLE',
          statusColor: 'gray',
        },
        {
          id: 7,
          label: '7. MARKET SENTIMENT SKEW (MSS %)',
          value: `${(Math.random() * 10 - 5).toFixed(1)}%`,
          statusLabel: 'BALANCED',
          statusColor: 'gray',
          isHighlighted: true,
        },
        {
          id: 8,
          label: '8. OID DIVERGENCE (NORMALIZED x)',
          value: `${(Math.random() * 2 - 1).toFixed(2)}x`,
          statusLabel: 'FAIR VALUE',
          statusColor: 'gray',
        },
        {
          id: 9,
          label: '9. LIQUIDITY FRACTAL DENSITY (LFD /min)',
          value: `${(Math.random() * 2).toFixed(2)}/m`,
          statusLabel: 'CLEAN',
          statusColor: 'gray',
          isHighlighted: true,
        },
        {
          id: 10,
          label: '10. BID WALL (DEFENSE QTY)',
          value: Math.floor(Math.random() * 100),
          statusLabel: 'WEAK',
          statusColor: 'red',
        },
        {
          id: 11,
          label: '11. ASK WALL (RESIST Qty)',
          value: Math.floor(Math.random() * 100),
          statusLabel: 'WEAK',
          statusColor: 'green',
        },
        {
          id: 12,
          label: '12. RECENT BRUISE (PRICE TARGET)',
          value: '---',
          statusLabel: 'INACTIVE',
          statusColor: 'gray',
        },
      ];

      resolve({
        price: parseFloat(currentPrice.toFixed(2)),
        lagMs: Math.floor(Math.random() * 3000), // Simulate occasional lag spikes like screenshot
        vcsScore: parseFloat((Math.random() * 2).toFixed(1)),
        vcsStatus: 'AWAITING FLOW...',
        ejectionPower: parseFloat((Math.random() * 10).toFixed(2)),
        ejectionStatus: 'EXHAUSTED/FADING',
        metrics,
        history: [...priceHistory]
      });
    }, latency);
  });
};

export const fetchAIAnalysis = async (state: VortexState): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are the Vortex Protocol AI Oracle. Analyze this crypto market data snapshot for a high-frequency trader.
      
      Price: ${state.price}
      VCS Score: ${state.vcsScore} (${state.vcsStatus})
      Ejection Power: ${state.ejectionPower}%
      Key Metrics: ${state.metrics.slice(0, 6).map(m => `${m.label}: ${m.value}`).join(', ')}

      Output a single, sharp, tactical observation or warning. Use cyberpunk/military jargon.
      Keep it under 140 characters. No intro. Style: Termina/Raw.`,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("AI Error", error);
    return "NEURAL LINK INTERRUPTED // OFFLINE";
  }
};