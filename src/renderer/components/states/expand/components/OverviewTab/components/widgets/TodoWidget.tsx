import React from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITIES, SIZES, type TodoItem } from '../../utils/overviewUtils';

interface TodoWidgetProps {
  todos: TodoItem[];
  expandedId: number | null;
  onOpenTodoPage: () => void;
  onToggleExpand: (id: number) => void;
  onToggleDone: (id: number) => void;
  onToggleSubDone: (todoId: number, subId: number) => void;
  onRemoveTodo: (id: number) => void;
}

export function TodoWidget({
  todos,
  expandedId,
  onOpenTodoPage,
  onToggleExpand,
  onToggleDone,
  onToggleSubDone,
  onRemoveTodo,
}: TodoWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const undoneTodos = todos.filter((todo) => !todo.done);
  const doneTodos = todos.filter((todo) => todo.done);
  const p0Count = todos.filter((todo) => !todo.done && todo.priority === 'P0').length;
  const p1Count = todos.filter((todo) => !todo.done && todo.priority === 'P1').length;
  const p2Count = todos.filter((todo) => !todo.done && todo.priority === 'P2').length;

  return (
    <div className="ov-dash-todo">
      <div className="ov-dash-todo-header">
        <span className="ov-dash-todo-title clickable" onClick={onOpenTodoPage} title={t('overview.todo.goToPage', { defaultValue: '前往待办事项页面' })}>{t('overview.todo.title', { defaultValue: '待办事项' })}</span>
        <div className="ov-dash-todo-stats">
          <span className="ov-dash-todo-stat done">✓ {doneTodos.length}</span>
          <span className="ov-dash-todo-stat undone">○ {undoneTodos.length}</span>
          {p0Count > 0 && <span className="ov-dash-todo-stat p0">P0 {p0Count}</span>}
          {p1Count > 0 && <span className="ov-dash-todo-stat p1">P1 {p1Count}</span>}
          {p2Count > 0 && <span className="ov-dash-todo-stat p2">P2 {p2Count}</span>}
        </div>
      </div>
      <div className="ov-dash-todo-list">
        {todos.length === 0 ? (
          <div className="ov-dash-todo-empty">{t('overview.todo.empty', { defaultValue: '暂无待办' })}</div>
        ) : (
          <>
            {undoneTodos.map((todo) => {
              const isExpanded = expandedId === todo.id;
              const pColor = PRIORITIES.find((p) => p.value === todo.priority)?.color;
              const sColor = SIZES.find((s) => s.value === todo.size)?.color;
              return (
                <div
                  key={todo.id}
                  className={`ov-dash-todo-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <div className="ov-dash-todo-row" onClick={() => onToggleExpand(todo.id)}>
                    <button
                      className="ov-dash-todo-check"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleDone(todo.id);
                      }}
                    >
                      ○
                    </button>
                    {todo.priority && (
                      <span className="ov-dash-todo-priority" style={{ background: pColor }}>
                        {todo.priority}
                      </span>
                    )}
                    {todo.size && (
                      <span className="ov-dash-todo-size" style={{ background: sColor }}>
                        {todo.size}
                      </span>
                    )}
                    <span className="ov-dash-todo-text">{todo.text}</span>
                    {(todo.description || (todo.subTodos && todo.subTodos.length > 0)) && (
                      <span className={`ov-dash-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                    )}
                    <button
                      className="ov-dash-todo-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveTodo(todo.id);
                      }}
                      aria-label={t('overview.todo.delete', { defaultValue: '删除' })}
                    >
                      ×
                    </button>
                  </div>
                  {isExpanded && todo.description && (
                    <div className="ov-dash-todo-desc">{todo.description}</div>
                  )}
                  {isExpanded && todo.subTodos && todo.subTodos.length > 0 && (
                    <div className="ov-dash-todo-subs">
                      {todo.subTodos.map((sub) => (
                        <div key={sub.id} className={`ov-dash-todo-sub ${sub.done ? 'done' : ''}`}>
                          <button
                            className="ov-dash-todo-sub-check"
                            onClick={() => onToggleSubDone(todo.id, sub.id)}
                          >
                            {sub.done ? '✓' : '○'}
                          </button>
                          {sub.priority && (
                            <span className="ov-dash-todo-priority" style={{ background: PRIORITIES.find((p) => p.value === sub.priority)?.color }}>
                              {sub.priority}
                            </span>
                          )}
                          {sub.size && (
                            <span className="ov-dash-todo-size" style={{ background: SIZES.find((s) => s.value === sub.size)?.color }}>
                              {sub.size}
                            </span>
                          )}
                          <span className="ov-dash-todo-sub-text">{sub.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {doneTodos.length > 0 && (
              <>
                <div className="ov-dash-todo-divider">{t('overview.todo.completed', { defaultValue: '已完成 {{count}}', count: doneTodos.length })}</div>
                {doneTodos.map((todo) => (
                  <div key={todo.id} className="ov-dash-todo-item done">
                    <div className="ov-dash-todo-row">
                      <button
                        className="ov-dash-todo-check"
                        onClick={() => onToggleDone(todo.id)}
                      >
                        ✓
                      </button>
                      <span className="ov-dash-todo-text">{todo.text}</span>
                      <button
                        className="ov-dash-todo-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveTodo(todo.id);
                        }}
                        aria-label={t('overview.todo.delete', { defaultValue: '删除' })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
