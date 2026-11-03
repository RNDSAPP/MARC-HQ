import type { PipelineCard, PipelineColumn } from '../data/types';
import { initials } from '../lib/format';
import './Pipeline.css';

type Props = {
  columns: PipelineColumn[];
  hotAction: string;
  onAction: (label: string) => void;
};

/** Pipeline in columns (clubs for RNDS, BDE for Club 421). */
export default function Pipeline({ columns, hotAction, onAction }: Props) {
  return (
    <div className="pipeline">
      {columns.map((column) => (
        <section key={column.name} className="pipeline-col" aria-label={`${column.name}, ${column.cards.length}`}>
          <h3 className="pipeline-col-head">
            <span className={`pipeline-dot pipeline-dot--${column.tone}`} aria-hidden="true" />
            <span className="pipeline-col-name">{column.name}</span>
            <span className="pipeline-col-count">{column.cards.length}</span>
          </h3>
          {column.cards.length === 0 ? (
            <p className="pipeline-empty">Rien ici</p>
          ) : (
            <ul className="pipeline-cards">
              {column.cards.map((card) => (
                <li key={card.name}>
                  <Card card={card} hot={column.hot} hotAction={hotAction} onAction={onAction} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

type CardProps = {
  card: PipelineCard;
  hot?: boolean;
  hotAction: string;
  onAction: (label: string) => void;
};

function Card({ card, hot, hotAction, onAction }: CardProps) {
  return (
    <article className={`pipeline-card${hot ? ' pipeline-card--hot' : ''}`}>
      <h4 className="pipeline-card-name">{card.name}</h4>
      <p className="pipeline-card-meta">{card.meta}</p>
      <div className="pipeline-card-foot">
        <span className="pipeline-avatar" aria-hidden="true">
          {initials(card.name)}
        </span>
        <span className="pipeline-card-when">{card.when}</span>
      </div>
      {hot && (
        <button type="button" className="pipeline-card-action" onClick={() => onAction(`${hotAction} : ${card.name}`)}>
          {hotAction}
          <span className="visually-hidden"> {card.name}</span>
        </button>
      )}
    </article>
  );
}
