import type { TableRow } from '../data/types';
import { initials } from '../lib/format';
import StatusBadge from './StatusBadge';
import './DataTable.css';

type Props = {
  caption: string;
  columns: TableRow;
  rows: TableRow[];
  /** Open the card of the row's first column. */
  onOpen: (name: string) => void;
};

/** Four-column table: name with avatar, two text columns, then a status badge. */
export default function DataTable({ caption, columns, rows, onOpen }: Props) {
  return (
    <div className="table-frame">
      <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
        <table className="table">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-empty">
                  Aucun résultat
                </td>
              </tr>
            ) : (
              rows.map(([name, second, third, status]) => (
                <tr key={name}>
                  <th scope="row">
                    <span className="table-name">
                      <span className="table-avatar" aria-hidden="true">
                        {initials(name)}
                      </span>
                      <button type="button" className="table-name-text table-open" onClick={() => onOpen(name)}>
                        {name}
                      </button>
                    </span>
                  </th>
                  <td>{second}</td>
                  <td className="table-mono">{third}</td>
                  <td>
                    <StatusBadge label={status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
