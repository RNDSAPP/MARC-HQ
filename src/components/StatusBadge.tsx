import { statusTone } from '../lib/format';
import './StatusBadge.css';

type Props = {
  label: string;
};

export default function StatusBadge({ label }: Props) {
  return <span className={`badge badge--${statusTone(label)}`}>{label}</span>;
}
