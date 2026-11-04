import { useId } from 'react';
import { weekSpan } from '../lib/dates';
import './WeeklySteps.css';

type Props = {
  series: number[];
  label: string;
  /** Smaller chart without the week axis, for the home cards. */
  compact?: boolean;
  /** One value per month instead of per week. */
  monthly?: boolean;
};

const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** The month `back` months ago, short ("août"). */
const monthAgo = (back: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return SHORT_MONTHS[d.getMonth()];
};

// Drawing units. The SVG stretches to the card, so lines keep their width with non-scaling strokes.
const W = 1200;
const H = 300;
// Share of each week drawn flat before sloping to the next week.
const FLAT = 0.6;

/**
 * Step chart of the last weeks: one plateau per week joined by a slope, a thick top line and an area
 * that fades out downwards. Past weeks are grey, the current week is in the project colour,
 * marked by a dot and a dashed leader.
 */
export default function WeeklySteps({ series, label, compact = false, monthly = false }: Props) {
  const id = useId();
  const span = weekSpan(series.length);
  const max = Math.max(...series);
  const min = Math.min(...series);
  const step = W / series.length;
  // Lowest week sits at 72 % of the height, the highest at 14 %, so no plateau touches an edge.
  const y = (value: number) => H * (0.72 - ((value - min) / (max - min || 1)) * 0.58);

  // Top line, week by week: flat, then a slope that lands at the start of the next week.
  const line: string[] = [];
  series.forEach((value, index) => {
    const x = index * step;
    line.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y(value).toFixed(1)}`);
    line.push(`L${(x + step * FLAT).toFixed(1)},${y(value).toFixed(1)}`);
  });
  line.push(`L${W},${y(series[series.length - 1]).toFixed(1)}`);
  const path = line.join(' ');

  const lastIndex = series.length - 1;
  const lastX = lastIndex * step;
  const lastY = y(series[lastIndex]);
  const previousBend = (lastIndex - 1) * step + step * FLAT;
  // The current week, from the slope that leads into it.
  const current = `M${previousBend.toFixed(1)},${y(series[lastIndex - 1]).toFixed(1)} L${lastX.toFixed(1)},${lastY.toFixed(1)} L${W},${lastY.toFixed(1)}`;

  return (
    <div className={compact ? 'steps steps--compact' : 'steps'}>
      <div className="steps-chart" role="img" aria-label={`${label} sur les ${series.length} ${monthly ? 'derniers mois' : 'dernières semaines'}`}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-past`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="steps-fill-past" stopOpacity="0.07" />
              <stop offset="1" className="steps-fill-past" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-now`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="steps-fill-now" stopOpacity="0.2" />
              <stop offset="1" className="steps-fill-now" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#${id}-past)`} />
          <path d={`${current} L${W},${H} L${previousBend.toFixed(1)},${H} Z`} fill={`url(#${id}-now)`} />

          {series.map((value, index) => (
            <line
              key={index}
              className="steps-guide"
              x1={index * step}
              x2={index * step}
              y1={y(value)}
              y2={H}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line className="steps-leader" x1={lastX} x2={lastX} y1={8} y2={lastY} vectorEffect="non-scaling-stroke" />

          <path d={path} className="steps-line" vectorEffect="non-scaling-stroke" />
          <path d={current} className="steps-line steps-line--now" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="steps-dot" style={{ left: `${(lastX / W) * 100}%` }} aria-hidden="true" />
      </div>
      {!compact && (
        <div className="steps-axis">
          <span>{monthly ? monthAgo(series.length - 1) : span.first}</span>
          <span>
            {series.length} {monthly ? 'derniers mois' : 'dernières semaines'}
          </span>
          <span>{monthly ? monthAgo(0) : span.last}</span>
        </div>
      )}
    </div>
  );
}
