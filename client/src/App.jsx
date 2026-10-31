import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle, ClipboardList, Clock3, Plus, Search, Trash2, X, Pencil, ListTodo, Sparkles } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

const emptyForm = { title: "", description: "", priority: "medium", dueDate: "" };

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTodos = useCallback(async () => {
    try {
      setError("");
      const data = await request("/todos");
      setTodos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  const counts = useMemo(() => ({
    all: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length
  }), [todos]);

  const visibleTodos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return todos.filter(todo => {
      const matchesFilter = filter === "all" || (filter === "active" ? !todo.completed : todo.completed);
      const matchesSearch = !query || `${todo.title} ${todo.description}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [todos, filter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(todo) {
    setEditing(todo._id);
    setForm({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority || "medium",
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : ""
    });
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      if (editing) {
        const updated = await request(`/todos/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
        setTodos(current => current.map(todo => todo._id === editing ? updated : todo));
      } else {
        const created = await request("/todos", { method: "POST", body: JSON.stringify(payload) });
        setTodos(current => [created, ...current]);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTodo(todo) {
    try {
      const updated = await request(`/todos/${todo._id}/toggle`, { method: "PATCH" });
      setTodos(current => current.map(item => item._id === todo._id ? updated : item));
    } catch (err) { setError(err.message); }
  }

  async function deleteTodo(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await request(`/todos/${id}`, { method: "DELETE" });
      setTodos(current => current.filter(todo => todo._id !== id));
    } catch (err) { setError(err.message); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><ListTodo size={21} /></span> daymark</a>
        <span className="top-note"><span className="online-dot" /> Your day, in focus</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> MAKE TODAY COUNT</div>
        <h1>A little progress<br /><span>goes a long way.</span></h1>
        <p>Keep your tasks clear, your mind calm, and your day moving.</p>
      </section>

      <section className="workspace">
        <div className="summary-row">
          <div><div className="section-kicker">YOUR WORKSPACE</div><h2>My tasks <span className="total-pill">{counts.all}</span></h2></div>
          <button className="primary-btn" onClick={openCreate}><Plus size={18} /> Add task</button>
        </div>

        <div className="toolbar">
          <div className="filters" role="tablist" aria-label="Filter tasks">
            {["all", "active", "completed"].map(item => (
              <button key={item} className={`filter-btn ${filter === item ? "selected" : ""}`} onClick={() => setFilter(item)}>
                {item[0].toUpperCase() + item.slice(1)} <span>{counts[item]}</span>
              </button>
            ))}
          </div>
          <label className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." /></label>
        </div>

        {error && <div className="error-banner">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}

        {loading ? <div className="empty-state"><div className="empty-icon"><Clock3 /></div><h3>Loading your tasks...</h3></div> :
          visibleTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ClipboardList size={27} /></div>
              <h3>{search ? "No matching tasks" : filter === "completed" ? "Nothing completed yet" : "Your list is clear"}</h3>
              <p>{search ? "Try another search term." : "Add a task and make your next step count."}</p>
              {!search && filter !== "completed" && <button className="text-btn" onClick={openCreate}><Plus size={16} /> Create your first task</button>}
            </div>
          ) : (
            <div className="todo-list">
              {visibleTodos.map(todo => (
                <article className={`todo-card ${todo.completed ? "is-complete" : ""}`} key={todo._id}>
                  <button className="check-btn" onClick={() => toggleTodo(todo)} aria-label={todo.completed ? "Mark as active" : "Mark as completed"}>
                    {todo.completed ? <span className="checked"><Check size={15} /></span> : <Circle size={22} />}
                  </button>
                  <div className="todo-content">
                    <div className="todo-title-row"><h3>{todo.title}</h3><span className={`priority ${todo.priority}`}>{todo.priority}</span></div>
                    {todo.description && <p className="todo-description">{todo.description}</p>}
                    {todo.dueDate && <div className="due-date"><Clock3 size={13} /> Due {formatDate(todo.dueDate)}</div>}
                  </div>
                  <div className="todo-actions">
                    <button onClick={() => openEdit(todo)} aria-label="Edit task"><Pencil size={16} /></button>
                    <button onClick={() => deleteTodo(todo._id)} aria-label="Delete task"><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        <footer className="list-footer"><span>{counts.active} {counts.active === 1 ? "task" : "tasks"} left to do</span><span>Built for a more focused day <span className="footer-heart">✦</span></span></footer>
      </section>
      <div className="page-footer">DAYMARK <span>·</span> PLAN LESS. DO MORE.</div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <form className="task-modal" onSubmit={handleSubmit}>
            <div className="modal-heading"><div><div className="section-kicker">{editing ? "UPDATE TASK" : "NEW TASK"}</div><h2>{editing ? "Edit your task" : "What's on your mind?"}</h2></div><button type="button" className="close-btn" onClick={() => setShowForm(false)}><X size={19} /></button></div>
            <label className="field-label">Task title <span>*</span><input autoFocus maxLength="120" required placeholder="e.g. Finish project proposal" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
            <label className="field-label">Description <small>OPTIONAL</small><textarea rows="3" maxLength="1000" placeholder="Add a few details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <div className="field-grid">
              <label className="field-label">Priority<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label className="field-label">Due date<input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : <><Plus size={17} /> Create task</>}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
