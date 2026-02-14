/**
 * QuickChart API 래퍼
 * 무료, API 키 불필요. URL로 차트 이미지 직접 참조.
 */

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
    }>;
  };
  options?: any;
}

const COLORS = {
  primary: '#2563EB',
  secondary: '#10B981',
  accent: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  gray: '#6B7280',
};

const COLOR_PALETTE = [
  COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.red,
  COLORS.purple, COLORS.pink, COLORS.cyan, COLORS.gray,
];

const BG_PALETTE = [
  'rgba(37,99,235,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)',
  'rgba(239,68,68,0.7)', 'rgba(139,92,246,0.7)', 'rgba(236,72,153,0.7)',
  'rgba(6,182,212,0.7)', 'rgba(107,114,128,0.7)',
];

export class QuickChartService {
  private baseUrl = 'https://quickchart.io/chart';
  private width: number;
  private height: number;

  constructor(width = 600, height = 400) {
    this.width = width;
    this.height = height;
  }

  /**
   * Generate chart URL from config
   */
  getChartUrl(config: ChartConfig): string {
    // Auto-assign colors if not provided
    const enriched = this.enrichColors(config);
    const chartJson = JSON.stringify(enriched);
    const encoded = encodeURIComponent(chartJson);
    return `${this.baseUrl}?c=${encoded}&w=${this.width}&h=${this.height}&bkg=white&f=png`;
  }

  private enrichColors(config: ChartConfig): ChartConfig {
    const clone = JSON.parse(JSON.stringify(config)) as ChartConfig;
    
    if (clone.type === 'pie' || clone.type === 'doughnut' || clone.type === 'polarArea') {
      for (const ds of clone.data.datasets) {
        if (!ds.backgroundColor) {
          ds.backgroundColor = BG_PALETTE.slice(0, clone.data.labels.length);
          ds.borderColor = '#ffffff';
          ds.borderWidth = 2;
        }
      }
    } else {
      clone.data.datasets.forEach((ds, i) => {
        if (!ds.backgroundColor) {
          ds.backgroundColor = BG_PALETTE[i % BG_PALETTE.length];
        }
        if (!ds.borderColor) {
          ds.borderColor = COLOR_PALETTE[i % COLOR_PALETTE.length];
        }
        if (ds.borderWidth === undefined) ds.borderWidth = 2;
      });
    }

    // Default options
    if (!clone.options) {
      clone.options = {
        plugins: {
          legend: { display: clone.data.datasets.length > 1 || clone.type === 'pie' || clone.type === 'doughnut' },
        },
        scales: (clone.type === 'pie' || clone.type === 'doughnut' || clone.type === 'polarArea' || clone.type === 'radar')
          ? undefined
          : { y: { beginAtZero: true } },
      };
    }

    return clone;
  }

  /**
   * Convenience: bar chart
   */
  barChart(labels: string[], datasets: Array<{ label: string; data: number[] }>): string {
    return this.getChartUrl({ type: 'bar', data: { labels, datasets } });
  }

  /**
   * Convenience: line chart
   */
  lineChart(labels: string[], datasets: Array<{ label: string; data: number[]; fill?: boolean }>): string {
    return this.getChartUrl({ type: 'line', data: { labels, datasets } });
  }

  /**
   * Convenience: pie chart
   */
  pieChart(labels: string[], data: number[]): string {
    return this.getChartUrl({
      type: 'pie',
      data: { labels, datasets: [{ label: '', data }] },
    });
  }

  /**
   * Convenience: doughnut chart
   */
  doughnutChart(labels: string[], data: number[]): string {
    return this.getChartUrl({
      type: 'doughnut',
      data: { labels, datasets: [{ label: '', data }] },
    });
  }
}
