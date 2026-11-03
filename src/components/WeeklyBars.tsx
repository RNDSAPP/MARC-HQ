import { weekSpan } from '../lib/dates';
import './WeeklyBars.css';

type Props = {
  series: number[];
  label: string;
};

/** Bar chart of the last weeks. The latest week is in the project colour, the 3 before it a bit lighter. */
export default function WeeklyBars({ series, label }: Props) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = weekSpan(series.length);

  return (
    <div className="weekly">
      <div className="weekly-bars" role="img" aria-label={`${label} sur les ${series.length} dernières semaines`}>
        {series.map((value, index) => {
          const height = Math.round(18 + ((value - min) / (max - min || 1)) * 78);
          const age = series.length - 1 - index;
          const tone = age === 0 ? 'now' : age <= 3 ? 'recent' : 'old';
          return <span key={index} className={`weekly-bar weekly-bar--${tone}`} style={{ height }} />;
        })}
      </div>
      <div className="weekly-axis">
        <span>{span.first}</span>
        <span>{series.length} dernières semaines</span>
        <span>{span.last}</span>
      </div>
    </div>
  );
}
