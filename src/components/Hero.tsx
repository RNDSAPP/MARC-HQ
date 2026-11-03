import './Hero.css';

type Props = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  onAction: (label: string) => void;
};

/** Title block of a module: what needs Marc now, and the two actions. */
export default function Hero({ eyebrow, headline, sub, cta, onAction }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <span className="hero-eyebrow">{eyebrow}</span>
      <h1 id="hero-title" className="hero-title">
        {headline}
      </h1>
      <p className="hero-sub">{sub}</p>
      <div className="hero-actions">
        <button type="button" className="hero-cta" onClick={() => onAction(cta)}>
          {cta}
        </button>
        <button type="button" className="hero-agent" onClick={() => onAction('Confier à l’agent')}>
          <span className="hero-agent-dot" aria-hidden="true" />
          Confier à l'agent
        </button>
      </div>
    </section>
  );
}
