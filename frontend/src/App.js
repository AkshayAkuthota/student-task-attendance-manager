import React, { useCallback, useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function request(path, options = {}, token) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("studenthub_token") || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studenthub_user") || "null"); }
    catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [page, setPage] = useState("Dashboard");
  const [modal, setModal] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ subject: "", present: "", total: "" });
  const [form, setForm] = useState({ title: "", subject: "", dueDate: "" });
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("asc");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("studenthub_token");
    localStorage.removeItem("studenthub_user");
    setToken("");
    setUser(null);
    setTasks([]);
    setAttendance([]);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const status = filter === "All" ? "" : `&status=${encodeURIComponent(filter)}`;
      const taskPath = `/tasks?sort=${sort}${status}&search=${encodeURIComponent(search)}`;
      const [taskData, attendanceData] = await Promise.all([
        request(taskPath, {}, token),
        request("/attendance", {}, token)
      ]);
      setTasks(taskData);
      setAttendance(attendanceData);
    } catch (e) {
      setError(e.message);
      if (/token|log in|session/i.test(e.message)) logout();
    }
  }, [token, filter, sort, search, logout]);

  useEffect(() => { loadData(); }, [loadData]);

  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const body = authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      const data = await request(path, { method: "POST", body: JSON.stringify(body) });
      if (authMode === "register") {
        setNotice(data.message || "Registration successful. Please log in.");
        setAuthMode("login");
        setAuthForm({ name: "", email: authForm.email, password: "" });
      } else {
        localStorage.setItem("studenthub_token", data.token);
        localStorage.setItem("studenthub_user", JSON.stringify(data.user));
        setToken(data.token); setUser(data.user);
        setNotice("Welcome back!");
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function addTask(e) {
    e.preventDefault(); setError(""); setNotice("");
    try {
      await request("/tasks", {
        method: "POST", body: JSON.stringify(form)
      }, token);
      setForm({ title: "", subject: "", dueDate: "" });
      setModal(false);
      setNotice("Task created.");
      await loadData();
    } catch (e) { setError(e.message); }
  }

  async function addAttendance(e) {
    e.preventDefault(); setError(""); setNotice("");
    const presentCount = Number(attendanceForm.present);
    const totalCount = Number(attendanceForm.total);
    if (!attendanceForm.subject.trim() || attendanceForm.present === "" || attendanceForm.total === "" ||
        !Number.isInteger(presentCount) || !Number.isInteger(totalCount) || presentCount < 0 ||
        totalCount < 0 || presentCount > totalCount) {
      setError("Enter a subject and valid class counts. Present classes cannot exceed total classes.");
      return;
    }
    try {
      await request("/attendance", {
        method: "POST",
        body: JSON.stringify({ subject: attendanceForm.subject.trim(), present: presentCount, total: totalCount })
      }, token);
      setAttendanceForm({ subject: "", present: "", total: "" });
      setAttendanceModal(false);
      setNotice("Attendance saved successfully.");
      await loadData();
    } catch (e) { setError(e.message); }
  }

  async function toggleTask(task) {
    try {
      await request(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: task.status === "Completed" ? "Pending" : "Completed" })
      }, token);
      await loadData();
    } catch (e) { setError(e.message); }
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await request(`/tasks/${id}`, { method: "DELETE" }, token);
      setNotice("Task deleted.");
      await loadData();
    } catch (e) { setError(e.message); }
  }

  const present = attendance.reduce((sum, x) => sum + Number(x.present), 0);
  const total = attendance.reduce((sum, x) => sum + Number(x.total), 0);
  const percentage = total ? Math.round(present / total * 100) : 0;
  const pending = tasks.filter(x => x.status !== "Completed").length;
  const completed = tasks.filter(x => x.status === "Completed").length;

  if (!token || !user) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={submitAuth}>
          <div className="logo auth-logo">S</div>
          <h1>StudentHub</h1>
          <p className="muted">Student Task & Attendance Manager</p>
          <div className="auth-tabs">
            <button type="button" className={authMode === "login" ? "tab active-tab" : "tab"} onClick={() => { setAuthMode("login"); setError(""); }}>Login</button>
            <button type="button" className={authMode === "register" ? "tab active-tab" : "tab"} onClick={() => { setAuthMode("register"); setError(""); }}>Register</button>
          </div>
          {authMode === "register" && <label>Full name<input required maxLength="100" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" /></label>}
          <label>Email<input type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="student@example.com" /></label>
          <label>Password<input type="password" required minLength="8" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 8 characters" /></label>
          {error && <p className="alert error">{error}</p>}
          {notice && <p className="alert success">{notice}</p>}
          <button className="primary wide" disabled={busy}>{busy ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}</button>
          <small className="muted">Your tasks and attendance are private to your account.</small>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="logo">S</div><div><b>StudentHub</b><small>Manager</small></div></div>
        <nav>{["Dashboard", "Tasks", "Attendance", "Profile"].map(item => (
          <button key={item} className={page === item ? "nav active" : "nav"} onClick={() => setPage(item)}>
            <span>{item === "Dashboard" ? "⌂" : item === "Tasks" ? "✓" : item === "Attendance" ? "◔" : "◉"}</span>{item}
          </button>
        ))}</nav>
        <div className="user"><div className="avatar">{(user.name || "S").slice(0, 1).toUpperCase()}</div><div><b>{user.name}</b><small>Student</small></div><button className="logout" onClick={logout}>Log out</button></div>
      </aside>

      <main>
        <header><div><h1>{page}</h1><p>Here's your academic overview.</p></div>
          <div className="search">⌕ <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." /></div>
        </header>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {page === "Dashboard" && <>
          <section className="stats">
            <Stat icon="◔" title="Attendance" value={`${percentage}%`} text="Overall attendance" />
            <Stat icon="✓" title="Pending Tasks" value={pending} text="Tasks to complete" />
            <Stat icon="▦" title="Subjects" value={attendance.length} text="This semester" />
            <Stat icon="★" title="Completed" value={completed} text="Tasks completed" />
          </section>
          <section className="columns">
            <div className="card"><div className="card-title"><div><h2>Recent Tasks</h2><p>Keep track of your academic work</p></div><button className="outline" onClick={() => setPage("Tasks")}>View all</button></div>
              <TaskTable tasks={tasks.slice(0, 5)} toggleTask={toggleTask} deleteTask={deleteTask} /></div>
            <div className="card"><div className="card-title"><div><h2>Attendance</h2><p>Subject-wise overview</p></div></div>
              {attendance.map(x => <Attendance key={x.id} {...x} />)}
              {!attendance.length && <p className="empty">No attendance records yet.</p>}
            </div>
          </section>
        </>}

        {page === "Tasks" && <div className="card full">
          <div className="card-title"><div><h2>My Tasks</h2><p>Create and manage assignments.</p></div><button className="primary" onClick={() => setModal(true)}>+ Add Task</button></div>
          <div className="filters">
            <label>Filter status<select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Pending</option><option>Completed</option></select></label>
            <label>Due date sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="asc">Earliest first</option><option value="desc">Latest first</option></select></label>
          </div>
          <TaskTable tasks={tasks} toggleTask={toggleTask} deleteTask={deleteTask} />
        </div>}

        {page === "Attendance" && <div className="card full">
          <div className="card-title"><div><h2>Attendance Report</h2><p>Low-attendance alert threshold: below 75%.</p></div><div className="attendance-actions"><strong className="percent">{percentage}%</strong><button className="primary" onClick={() => { setAttendanceModal(true); setError(""); setNotice(""); }}>+ Add Attendance</button></div></div>
          <div className="attendance-grid">{attendance.map(x => {
            const p = Number(x.percentage ?? (x.total ? x.present / x.total * 100 : 0));
            return <div className="subject" key={x.id}><h3>{x.subject}</h3><div className="bar"><i className={p < 75 ? "low" : ""} style={{ width: `${Math.min(100, p)}%` }} /></div><b>{p.toFixed(1)}%</b><small>{x.present} present / {x.total} classes</small>{p < 75 && x.total > 0 && <p className="alert error">⚠ Low attendance. Attend more classes.</p>}</div>;
          })}</div>
          {!attendance.length && <p className="empty">No attendance records yet. Click “Add Attendance” to add your first subject.</p>}
        </div>}

        {page === "Profile" && <div className="card profile"><div className="cover"></div><div className="profile-body"><div className="large-avatar">{(user.name || "S").slice(0, 1).toUpperCase()}</div><h2>{user.name}</h2><p>{user.email}</p><div className="profile-grid"><div><small>Account</small><b>Student</b></div><div><small>Task count</small><b>{tasks.length}</b></div><div><small>Subjects</small><b>{attendance.length}</b></div></div></div></div>}
      </main>

      {attendanceModal && <div className="modal-bg"><form className="modal" onSubmit={addAttendance}>
        <h2>Add Attendance</h2>
        <label>Subject<input required maxLength="100" value={attendanceForm.subject} onChange={e => setAttendanceForm({ ...attendanceForm, subject: e.target.value })} placeholder="e.g. Electrical Machines" /></label>
        <label>Classes attended<input required type="number" min="0" step="1" value={attendanceForm.present} onChange={e => setAttendanceForm({ ...attendanceForm, present: e.target.value })} placeholder="e.g. 20" /></label>
        <label>Total classes conducted<input required type="number" min="0" step="1" value={attendanceForm.total} onChange={e => setAttendanceForm({ ...attendanceForm, total: e.target.value })} placeholder="e.g. 24" /></label>
        <p className="muted">Attendance percentage is calculated automatically. Present classes cannot exceed total classes.</p>
        <div className="modal-actions"><button type="button" className="outline" onClick={() => setAttendanceModal(false)}>Cancel</button><button className="primary">Save Attendance</button></div>
      </form></div>}

      {modal && <div className="modal-bg"><form className="modal" onSubmit={addTask}>
        <h2>Add New Task</h2>
        <label>Task title<input required maxLength="200" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. DBMS assignment" /></label>
        <label>Subject<input required maxLength="100" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Database Management" /></label>
        <label>Due date<input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
        <div className="modal-actions"><button type="button" className="outline" onClick={() => setModal(false)}>Cancel</button><button className="primary">Create Task</button></div>
      </form></div>}
    </div>
  );
}

function Stat({ icon, title, value, text }) {
  return <div className="card stat"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{text}</small></div></div>;
}
function TaskTable({ tasks, toggleTask, deleteTask }) {
  return <div className="table-wrap"><table><thead><tr><th>Task</th><th>Subject</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>{tasks.map(t => <tr key={t.id}><td><div className="task"><button aria-label="Toggle task status" className={t.status === "Completed" ? "check done" : "check"} onClick={() => toggleTask(t)}>{t.status === "Completed" ? "✓" : ""}</button><b>{t.title}</b></div></td><td>{t.subject}</td><td>{t.dueDate ? String(t.dueDate).slice(0, 10) : "—"}</td><td><span className={t.status === "Completed" ? "pill green" : "pill yellow"}>{t.status}</span></td><td><button className="delete" onClick={() => deleteTask(t.id)} aria-label="Delete task">×</button></td></tr>)}</tbody></table>
    {!tasks.length && <div className="empty">No tasks found. Add a task or change your filters.</div>}
  </div>;
}
function Attendance({ subject, present, total, percentage, alert }) {
  const p = Number(percentage ?? (total ? present / total * 100 : 0));
  return <div className="att"><div className="att-head"><b>{subject}</b><span>{p.toFixed(1)}%</span></div><div className="bar"><i className={p < 75 ? "low" : ""} style={{ width: `${Math.min(100, p)}%` }} /></div><small>{present}/{total} classes attended</small>{p < 75 && total > 0 && <small className="warning">{alert || "Low attendance"}</small>}</div>;
}
export default App;
