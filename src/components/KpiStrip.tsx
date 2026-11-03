import type { Kpi } from '../data/types';
import './KpiStrip.css';
import { compact } from '../lib/format';

type Props = {
  kpis: Kpi[];
};

export default function KpiStrip({ kpis }: Props) {
  return (
    <section aria-label="Chiffres clés">
      <dl className="kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi">
            <dt className="kpi-label">{kpi.label}</dt>
            <dd className="kpi-values">
              <span className="kpi-value">{compact(kpi.value)}</span>
              <span className="kpi-delta">{kpi.delta}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
