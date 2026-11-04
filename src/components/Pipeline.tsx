import { Link } from 'react-router-dom';
import type { PipelineCard, PipelineColumn } from '../data/types';
import { initials } from '../lib/format';
import './Pipeline.css';

type Props = {
  columns: PipelineColumn[];
  hotAction: string;
  onAction: (label: string) => void;
  /** Open the card of a club. */
  onOpen: (name: string) => void;
  /** Where the whole list is, when a column shows only its first cards. */
  moreHref?: string;
};

/** Pipeline in columns (clubs for RNDS, BDE for Club 421). */
export default function Pipeline({ columns, hotAction, onAction, onOpen, moreHref }: Props) {
  if (columns.every((column) => column.cards.length === 0)) {
    return (
      <p className="pipeline-none">
        Rien dans le pipeline pour l'instant. Chaque nouveau contact apparaîtra ici, dans son étape : {columns.map((column) => column.name.toLowerCase()).join(', ')}.
      </p>
    );
  }
  return (
    <div className="pipeline">
      {columns.map((column) => (
        <section key={column.name} className="pipeline-col" aria-label={`${column.name}, ${column.total ?? column.cards.length}`}>
          <h3 className="pipeline-col-head">
            <span className={`pipeline-dot pipeline-dot--${column.tone}`} aria-hidden="true" />
            <span className="pipeline-col-name">{column.name}</span>
            <span className="pipeline-col-count">{column.total ?? column.cards.length}</span>
          </h3>
          {column.cards.length === 0 ? (
            <p className="pipeline-empty">Rien ici</p>
          ) : (
            <ul className="pipeline-cards">
              {column.cards.map((card) => (
                <li key={card.name}>
                  <Card card={card} hot={column.hot} hotAction={hotAction} onAction={onAction} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          )}
          {column.total !== undefined && column.total > column.cards.length && (
            moreHref ? (
              <Link className="pipeline-more" to={moreHref}>
                + {column.total - column.cards.length} autres
              </Link>
            ) : (
              <p className="pipeline-more">+ {column.total - column.cards.length} autres</p>
            )
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
  onOpen: (name: string) => void;
};

function Card({ card, hot, hotAction, onAction, onOpen }: CardProps) {
  return (
    <article className={`pipeline-card${hot ? ' pipeline-card--hot' : ''}`}>
      <h4 className="pipeline-card-name">
        <button type="button" className="pipeline-card-open" onClick={() => onOpen(card.name)}>
          {card.name}
        </button>
      </h4>
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
