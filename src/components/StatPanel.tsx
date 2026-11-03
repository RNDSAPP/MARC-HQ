import WeeklySteps from './WeeklySteps';
import './StatPanel.css';
import { compact } from '../lib/format';

type Props = {
  label: string;
  value: string;
  delta: string;
  series: number[];
};

/** The module's main figure, big and thin, over its 12-week step chart. */
export default function StatPanel({ label, value, delta, series }: Props) {
  return (
    <section className="stat" aria-labelledby="stat-label">
      <h2 id="stat-label" className="stat-label">
        {label}
      </h2>
      <div className="stat-figure">
        <span className="stat-value">{compact(value)}</span>
        <span className="stat-delta">{delta}</span>
      </div>
      <WeeklySteps series={series} label={label} />
    </section>
  );
}
