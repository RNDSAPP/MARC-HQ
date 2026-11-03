import WeeklyBars from './WeeklyBars';
import './Hero.css';

type Props = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  heroLabel: string;
  heroNum: string;
  heroDelta: string;
  series: number[];
  onAction: (label: string) => void;
};

/** Poster-style title block of a module, with its main number and 12-week chart. */
export default function Hero({ eyebrow, headline, sub, cta, heroLabel, heroNum, heroDelta, series, onAction }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-text">
        <div className="hero-copy">
          <span className="hero-eyebrow">{eyebrow}</span>
          <h1 id="hero-title" className="hero-title">
            {headline}
          </h1>
          <p className="hero-sub">{sub}</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="hero-cta" onClick={() => onAction(cta)}>
            {cta}
          </button>
          <button type="button" className="hero-agent" onClick={() => onAction('Confier à l’agent')}>
            <span className="hero-agent-dot" aria-hidden="true" />
            Confier à l'agent
          </button>
        </div>
      </div>

      <div className="hero-stat">
        <div className="hero-stat-head">
          <span className="hero-stat-label">{heroLabel}</span>
          <span className="hero-stat-delta">{heroDelta}</span>
        </div>
        <span className="hero-stat-num">{heroNum}</span>
        <WeeklyBars series={series} label={heroLabel} />
      </div>
    </section>
  );
}
