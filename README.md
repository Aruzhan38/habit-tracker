Habit Tracker 🧠📆
A full-stack Habit Tracker web application that helps users build habits, track daily progress, visualize statistics, and receive reminders.

✨ Features
- User authentication (JWT)
- Create, update, archive, and delete habits
- Daily check-ins (habit completion)
- Calendar view (daily habit tracking)
- Statistics dashboard:
  - Daily / Weekly / Monthly completion %
  - Current streak & best streak
  - Year heatmap calendar
- Email reminders (Gmail SMTP)
- User profile with avatar upload
- Responsive UI


🛠 Tech Stack
Frontend
- HTML
- CSS (Bootstrap 5)
- Vanilla JavaScript
- Chart.js

Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Nodemailer (Gmail SMTP)

📁 Project Structure
habit-tracker/
│
├── public/
│   ├── css/
│   ├── js/
│   └── dashboard.html
│
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── middleware/
│
├── uploads/
│   └── avatars/
│
├── server.js
├── package.json
└── README.md

---

⚙️ Setup Instructions

1. Clone repository
```bash
git clone https://github.com/aruzhan-38/habit-tracker.git
cd habit-tracker

2. Install dependencies
npm install

3. Environment variables

4. Run the project
node server.js


📡 API Documentation

Auth
Register
POST /api/auth/register

Login
POST /api/auth/login

User
Get profile
GET /api/users/me

Update profile
PATCH /api/users/me

Upload avatar
POST /api/users/me/avatar


Habits

Create habit
POST /api/habits

Get habits
GET /api/habits?status=active

Archive habit
POST /api/habits/:id/archive

Unarchive habit
POST /api/habits/:id/unarchive

Delete habit
DELETE /api/habits/:id


Statistics

Overview stats
GET /api/stats/overview?days=365

Response includes:
	•	totalHabits
	•	totalCheckins
	•	completionRate
	•	currentStreak
	•	bestStreak
	•	byDay (daily aggregation)

📊 Statistics Logic
	•	Daily – based on daily check-ins
	•	Weekly – aggregated from daily data
	•	Monthly – aggregated from daily data
	•	Year heatmap – full calendar year (Jan 1 – Dec 31)


🚀 Future Improvements
	•	Mobile app version
	•	Push notifications
	•	Habit analytics per habit
	•	Social features (sharing streaks)
