import type { Agent } from '../data/types';
import { agentStatusLabel } from '../lib/format';
import './AgentCard.css';

type Props = {
  agent: Agent;
  onAction: (label: string) => void;
};

export default function AgentCard({ agent, onAction }: Props) {
  return (
    <article className={`agent agent--${agent.status}`}>
      <div className="agent-head">
        <h3 className="agent-name">{agent.name}</h3>
        <span className="agent-status">{agentStatusLabel[agent.status]}</span>
      </div>
      <p className="agent-task">{agent.task}</p>
      <div className="agent-foot">
        <span className="agent-when">{agent.when}</span>
        <button type="button" className="agent-action" onClick={() => onAction(`${agent.action} : ${agent.name}`)}>
          {agent.action}
          <span className="visually-hidden"> ({agent.name})</span>
        </button>
      </div>
    </article>
  );
}
