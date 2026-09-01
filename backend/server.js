const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [
  { id: 1, title: "Complete DBMS assignment", subject: "Database Management", dueDate: "2026-09-03", status: "Pending" },
  { id: 2, title: "Prepare COA presentation", subject: "Computer Architecture", dueDate: "2026-09-05", status: "Pending" },
  { id: 3, title: "Submit ML lab record", subject: "Machine Learning", dueDate: "2026-08-30", status: "Completed" },
  { id: 4, title: "Practice coding problems", subject: "DSA", dueDate: "2026-09-06", status: "Pending" }
];

const attendance = [
  { id: 1, subject: "Control System", present: 22, total: 25 },
  { id: 2, subject: "Database Management", present: 20, total: 24 },
  { id: 3, subject: "Computer Architecture", present: 18, total: 22 },
  { id: 4, subject: "Machine Learning", present: 21, total: 23 }
];

app.get("/api/tasks", (req, res) => res.json(tasks));

app.post("/api/tasks", (req, res) => {
  const task = {
    id: Date.now(),
    title: req.body.title,
    subject: req.body.subject,
    dueDate: req.body.dueDate || "",
    status: "Pending"
  };
  tasks.unshift(task);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  task.status = req.body.status || task.status;
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  res.json({ message: "Task deleted" });
});

app.get("/api/attendance", (req, res) => res.json(attendance));

app.listen(5000, () => {
  console.log("Backend running at http://localhost:5000");
});