import type { Todo } from '../data/types';
import './TodoList.css';

type Props = {
  todos: Todo[];
  done: Set<string>;
  onToggle: (id: string) => void;
};

export default function TodoList({ todos, done, onToggle }: Props) {
  return (
    <ul className="todos">
      {todos.map((todo) => {
        const checked = done.has(todo.id);
        return (
          <li key={todo.id}>
            <label className={`todo${checked ? ' todo--done' : ''}`}>
              <input type="checkbox" className="todo-box" checked={checked} onChange={() => onToggle(todo.id)} />
              <span className="todo-text">{todo.text}</span>
              <span className="todo-due">{todo.due}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
