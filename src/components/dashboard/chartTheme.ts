import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Chart colours, which cannot come from the token layer.
 *
 * Recharts writes `stroke` and `fill` as SVG presentation attributes, and those
 * do not accept `var()` — so a chart is the one place in the app that has to
 * resolve the theme in JavaScript rather than in CSS.
 *
 * The series colours are not the brand hexes in light mode. #FFBD2E measures
 * 1.6:1 on white: a revenue line in that amber is invisible on a pale card, so
 * light mode uses the same darkened brand values the text tokens use.
 */
export interface ChartTheme {
  grid: string;
  tick: { fill: string; fontSize: number };
  /** Revenue, the primary series. */
  revenue: string;
  /** Orders, the secondary series. */
  orders: string;
  /** Visitors and other tertiary series. */
  visitors: string;
  /** Categorical palette for pies and segmented bars. */
  categorical: string[];
}

const DARK: ChartTheme = {
  grid: 'rgba(255,255,255,0.06)',
  tick: { fill: 'rgba(255,255,255,0.45)', fontSize: 10 },
  revenue: '#FFBD2E',
  orders: '#FF5F56',
  visitors: '#27C93F',
  categorical: ['#FF5F56', '#FFBD2E', '#27C93F', '#38BDF8', '#C084FC'],
};

const LIGHT: ChartTheme = {
  grid: 'rgba(11,13,27,0.10)',
  tick: { fill: 'rgba(11,13,27,0.55)', fontSize: 10 },
  revenue: '#C97A00',
  orders: '#D93B2F',
  visitors: '#157A2E',
  categorical: ['#D93B2F', '#A85F00', '#157A2E', '#0E7490', '#6941C6'],
};

export function useChartTheme(): ChartTheme {
  const { theme } = useTheme();
  return useMemo(() => (theme === 'dark' ? DARK : LIGHT), [theme]);
}
