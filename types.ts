
export interface VortexMetric {
  id: number;
  label: string;
  value: string | number;
  subValue?: string;
  statusLabel: string;
  statusColor: 'gray' | 'green' | 'red' | 'pink' | 'blue';
  isHighlighted?: boolean; // For the pink border/text styles
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface VortexState {
  price: number;
  lagMs: number;
  vcsScore: number; // Vortex Composite Score
  vcsStatus: string;
  ejectionPower: number; // Percentage
  ejectionStatus: string;
  metrics: VortexMetric[];
  history: ChartPoint[];
}

// Added missing ChartProps interface
export interface ChartProps {
  data: any[];
  dataKey: string;
  title: string;
  color: string;
}

// Added missing BlockData interface
export interface BlockData {
  blockNumber: number;
  timestamp: string;
  transactions: number;
  gasUsed: number;
}