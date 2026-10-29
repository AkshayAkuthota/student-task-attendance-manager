# Student Task & Attendance Manager

React frontend + Express backend + PostgreSQL database.

## Features
- Student registration and login (bcrypt password hashing and JWT)
- Student-specific task records
- Create, complete, and delete tasks
- Filter tasks by status and sort by due date
- Search tasks by title or subject
- Subject-wise attendance percentage and alerts below 75%
- Request validation and API error handling

## Requirements
Node.js 18+ and PostgreSQL.

## 1. Set up PostgreSQL
Create a database named `student_manager`, then run `backend/schema.sql` against that database using pgAdmin or `psql`.

Example:
```sql
CREATE DATABASE student_manager;
```
Connect to `student_manager` before running `schema.sql`.

## 2. Configure backend
```bash
cd backend
npm install
```
Copy `.env.example` to `.env`, then update `DATABASE_URL` and `JWT_SECRET`.
Use a long random secret and do not commit `.env`.

Start backend:
```bash
npm run dev
```
API runs at `http://localhost:5000`.

## 3. Start frontend
Open a second terminal:
```bash
cd frontend
npm install
npm start
```
React opens at `http://localhost:3000`.

## 4. Using the app
Register a student account, then log in. Each student's tasks and attendance are isolated by account.

Attendance records can be created/updated through the authenticated endpoint:
`POST /api/attendance`
```json
{"subject":"Database Management","present":20,"total":24}
```
Include `Authorization: Bearer YOUR_TOKEN` and `Content-Type: application/json`.

Task endpoints:
- `GET /api/tasks?status=Pending&sort=asc&search=dbms`
- `POST /api/tasks` with `{ "title":"DBMS assignment", "subject":"Database Management", "dueDate":"2026-11-01" }`
- `PUT /api/tasks/:id` with `{ "status":"Completed" }`
- `DELETE /api/tasks/:id`

## Deployment
Deploy PostgreSQL and the backend, set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` in the hosting provider's environment settings, and deploy the frontend. For the frontend, set `REACT_APP_API_URL` to the deployed backend base URL ending in `/api`, for example `https://your-backend.example.com/api`, before building.
Use HTTPS, keep secrets private, and configure database backups for production.
