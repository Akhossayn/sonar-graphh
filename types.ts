
export interface VortexMetric {
  id: number;
  label: string;
  value: string | number;
  subValue?: string;
  statusLabel: string;
  statusColor: 'gray' | 'green' | 'red' | 'pink' | 'blue';
  isHighlighted?: boolean;
}

export interface ChartPoint {
  date: string;
  value: number;
}

// Format: "EXCHANGE:SYMBOL" (e.g., "BINANCE:BTCUSDT", "BYBIT:BTCUSDT")
export type MarketSymbol = string;

export interface MarketDef {
  symbol: string;
  exchange: 'BINANCE' | 'BYBIT';
  base: string;
  quote: string;
}

export interface VortexState {
  market: MarketDef;
  price: number;
  lagMs: number;
  vcsScore: number;
  vcsStatus: string;
  ejectionPower: number;
  ejectionStatus: string;
  metrics: VortexMetric[];
  history: ChartPoint[];
}

export interface ChartProps {
  data: any[];
  dataKey: string;
  title: string;
  color: string;
}
