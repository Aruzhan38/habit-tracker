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

🎮 Gamification System

1. XP (Experience Points)

Users earn XP by completing habits.

XP Rules (example logic)
	•	+10 XP per completed habit check-in
	•	Bonus XP for streak milestones (optional extension)
	•	XP accumulates permanently

XP is displayed in the profile card:
	•	Progress bar
	•	Current XP value
	•	Level badge

3. Coins

Coins are earned as a secondary reward system.

Example Coin Logic
	•	+1 coin per completed habit
	•	Bonus coins for streaks
	•	Coins stored per user

Coins are used in the Shop.

🛍️ Shop System

Users can open the Shop modal.

Features:
	•	Shows current coin balance
	•	Displays available items
	•	Some items are locked behind Premium

Example items:
	•	Theme unlocks
	•	Special badge styles
	•	UI accent colors
	•	Animated profile effects

💎 Premium Subscription

We introduced a Premium plan with extended features.

Free Plan
	•	Basic habits
	•	Weekly statistics
	•	Limited themes
	•	❌ Full year heatmap
	•	❌ Advanced analytics
	•	❌ Premium themes

Premium Plan ($4.99/month)

Includes:
	•	Everything in Free
	•	Full year heatmap
	•	Advanced analytics
	•	Unlimited history
	•	Premium themes
	•	Future exclusive features

💳 Demo Billing System

Premium upgrade flow includes:
	1.	Plan comparison modal
	2.	Secure card form (demo)
	3.	Card number validation
	4.	Expiry & CVC fields
	5.	Backend stores only last 4 digits (demo purpose)

This is a demo billing implementation for learning purposes.


🚀 Future Improvements
	•	Mobile app version
	•	Push notifications
	•	Habit analytics per habit
	•	Social features (sharing streaks)
