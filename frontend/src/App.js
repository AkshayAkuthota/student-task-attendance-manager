import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function App() {
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [page, setPage] = useState("Dashboard");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", dueDate: "" });

  const loadData = async () => {
    const taskData = await fetch(`${API}/tasks`).then(r => r.json());
    const attendanceData = await fetch(`${API}/attendance`).then(r => r.json());
    setTasks(taskData);
    setAttendance(attendanceData);
  };

  useEffect(() => { loadData(); }, []);

  const present = attendance.reduce((a, x) => a + x.present, 0);
  const total = attendance.reduce((a, x) => a + x.total, 0);
  const percentage = total ? Math.round(present / total * 100) : 0;
  const pending = tasks.filter(x => x.status !== "Completed").length;
  const completed = tasks.filter(x => x.status === "Completed").length;

  async function addTask(e) {
    e.preventDefault();
    if (!form.title || !form.subject) return;
    await fetch(`${API}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ title: "", subject: "", dueDate: "" });
    setModal(false);
    loadData();
  }

  async function toggleTask(task) {
    await fetch(`${API}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: task.status === "Completed" ? "Pending" : "Completed"
      })
    });
    loadData();
  }

  async function deleteTask(id) {
    await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
    loadData();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">S</div>
          <div><b>StudentHub</b><small>Manager</small></div>
        </div>

        <nav>
          {["Dashboard", "Tasks", "Attendance", "Profile"].map(item => (
            <button
              key={item}
              className={page === item ? "nav active" : "nav"}
              onClick={() => setPage(item)}
            >
              <span>{item === "Dashboard" ? "⌂" : item === "Tasks" ? "✓" : item === "Attendance" ? "◔" : "◉"}</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="user">
          <div className="avatar">AK</div>
          <div><b>Akshay Kumar</b><small>Student</small></div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <h1>{page}</h1>
            <p>Good afternoon! Here's your academic overview.</p>
          </div>
          <div className="search">⌕ <input placeholder="Search..." /></div>
        </header>

        {page === "Dashboard" && (
          <>
            <section className="stats">
              <Stat icon="◔" title="Attendance" value={`${percentage}%`} text="Overall attendance" />
              <Stat icon="✓" title="Pending Tasks" value={pending} text="Tasks to complete" />
              <Stat icon="▦" title="Subjects" value={attendance.length} text="This semester" />
              <Stat icon="★" title="Completed" value={completed} text="Tasks completed" />
            </section>

            <section className="columns">
              <div className="card">
                <div className="card-title">
                  <div><h2>Recent Tasks</h2><p>Keep track of your academic work</p></div>
                  <button className="outline" onClick={() => setPage("Tasks")}>View all</button>
                </div>
                <TaskTable tasks={tasks.slice(0, 5)} toggleTask={toggleTask} deleteTask={deleteTask} />
              </div>

              <div className="card">
                <div className="card-title"><div><h2>Attendance</h2><p>Subject-wise overview</p></div></div>
                {attendance.map(x => <Attendance key={x.id} {...x} />)}
              </div>
            </section>
          </>
        )}

        {page === "Tasks" && (
          <div className="card full">
            <div className="card-title">
              <div><h2>My Tasks</h2><p>Create and manage your assignments.</p></div>
              <button className="primary" onClick={() => setModal(true)}>+ Add Task</button>
            </div>
            <TaskTable tasks={tasks} toggleTask={toggleTask} deleteTask={deleteTask} />
          </div>
        )}

        {page === "Attendance" && (
          <div className="card full">
            <div className="card-title">
              <div><h2>Attendance Report</h2><p>Monitor your attendance before exams.</p></div>
              <strong className="percent">{percentage}%</strong>
            </div>
            <div className="attendance-grid">
              {attendance.map(x => {
                const p = Math.round(x.present / x.total * 100);
                return (
                  <div className="subject" key={x.id}>
                    <h3>{x.subject}</h3>
                    <div className="bar"><i style={{width: p + "%"}}></i></div>
                    <b>{p}%</b>
                    <small>{x.present} present / {x.total} classes</small>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page === "Profile" && (
          <div className="card profile">
            <div className="cover"></div>
            <div className="profile-body">
              <div className="large-avatar">PN</div>
              <h2>Nikhitha</h2>
              <p>Student • Computer Science</p>
              <div className="profile-grid">
                <div><small>College</small><b>NIT Rourkela</b></div>
                <div><small>Year</small><b>3rd Year</b></div>
                <div><small>Semester</small><b>5th Semester</b></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {modal && (
        <div className="modal-bg">
          <form className="modal" onSubmit={addTask}>
            <h2>Add New Task</h2>
            <label>Task title
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. DBMS assignment" />
            </label>
            <label>Subject
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g. Database Management" />
            </label>
            <label>Due date
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </label>
            <div className="modal-actions">
              <button type="button" className="outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="primary">Create Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, title, value, text }) {
  return <div className="card stat"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{text}</small></div></div>;
}

function TaskTable({ tasks, toggleTask, deleteTask }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Task</th><th>Subject</th><th>Due date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td><div className="task"><span className={t.status === "Completed" ? "check done" : "check"} onClick={() => toggleTask(t)}>{t.status === "Completed" ? "✓" : ""}</span><b>{t.title}</b></div></td>
              <td>{t.subject}</td>
              <td>{t.dueDate || "—"}</td>
              <td><span className={t.status === "Completed" ? "pill green" : "pill yellow"}>{t.status}</span></td>
              <td><button className="delete" onClick={() => deleteTask(t.id)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tasks.length && <div className="empty">No tasks yet. Add your first task!</div>}
    </div>
  );
}

function Attendance({ subject, present, total }) {
  const p = Math.round(present / total * 100);
  return <div className="att"><div className="att-head"><b>{subject}</b><span>{p}%</span></div><div className="bar"><i style={{width: p + "%"}}></i></div><small>{present}/{total} classes attended</small></div>;
}

export default App;