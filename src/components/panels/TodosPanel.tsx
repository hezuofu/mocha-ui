import { useState } from 'react';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export default function TodosPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState('');

  const addTodo = () => {
    if (!newText.trim()) return;
    setTodos([...todos, { id: String(Date.now()), text: newText.trim(), done: false }]);
    setNewText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
          placeholder="Add a task..."
          className="memory-textarea"
          style={{ padding: '6px 10px', minHeight: 'auto', flex: 1 }}
        />
        <button className="btn-primary-sm" onClick={addTodo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
        {todos.length === 0 ? (
          <div className="panel-empty">No tasks yet</div>
        ) : (
          todos.map(todo => (
            <div key={todo.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              border: '1px solid var(--border)', borderRadius: 8, marginBottom: 4,
              background: todo.done ? 'var(--surface-subtle)' : 'var(--bg)',
              opacity: todo.done ? 0.6 : 1,
            }}>
              <button className="btn-icon-sm" onClick={() => toggleTodo(todo.id)} title={todo.done ? 'Unmark' : 'Mark done'}>
                {todo.done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
                }
              </button>
              <span style={{
                flex: 1, fontSize: 13, color: 'var(--text)',
                textDecoration: todo.done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {todo.text}
              </span>
              <button className="btn-icon-sm danger" onClick={() => removeTodo(todo.id)} title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
