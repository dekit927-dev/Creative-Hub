# CreativeHub — Sherubtse Creative Community App

CreativeHub is a campus-based creative community application designed for Sherubtse College students. Users can showcase creative work (digital art, photography, design, illustration, traditional painting, literature, music, video), like and comment, follow other creators, participate in creative challenges, collaborate on projects, track shares, send direct messages in real time, and stay informed via notifications.

The application also features a full-fledged **Admin Dashboard, Creator Leaderboard & Analytics System** connected to PostgreSQL.

---

## Technologies
- **Backend:** Node.js, Express.js (MVC architecture, RESTful APIs)
- **Database:** PostgreSQL (`pg-promise` connection pool, relational schema, transactions, parameterized queries)
- **Real-Time Communication:** Socket.IO
- **Frontend & Views:** HTML5, CSS3, Vanilla JavaScript, EJS templates, Chart.js
- **Authentication & RBAC:** bcrypt password hashing + Express sessions and bearer tokens (Role-based access: `user` and `admin`)
- **File Uploads:** Multer (images saved to `public/uploads/`)
- **Testing & Tooling:** Automated Test Suite (`npm test`), Postman (`postman/CreativeHub_API.postman_collection.json`), Nodemon

---

## Project Structure
```
Creative-Hub/
├── config/
│   ├── db.js             # PostgreSQL connection pool with pg-promise
│   ├── initDb.js         # Database schema initializer & migrations
│   └── seed.js           # Sherubtse demo seed data & admin account
├── controllers/
│   ├── adminController.js# Admin dashboard, rankings, moderation & categories
│   ├── authController.js # Authentication, registration & sessions
│   ├── challengeController.js
│   ├── collaborationController.js
│   ├── creationController.js
│   ├── messageController.js
│   ├── notificationController.js
│   ├── searchController.js
│   ├── settingsController.js
│   ├── userController.js
│   └── viewController.js # EJS view rendering
├── middleware/
│   ├── authMiddleware.js # requireAuth and requireAdmin authorization middleware
│   ├── errorMiddleware.js# Centralized error handler
│   └── uploadMiddleware.js# Multer configuration for image uploads
├── models/
│   ├── adminModel.js     # SQL analytical aggregations & CTE rankings
│   ├── categoryModel.js  # Category CRUD with safe post reassignment
│   ├── challengeModel.js
│   ├── collaborationModel.js
│   ├── creationModel.js
│   ├── messageModel.js
│   ├── notificationModel.js
│   ├── reportModel.js    # Content reports & atomic resolution
│   ├── schema.sql        # Full PostgreSQL DDL script
│   ├── shareModel.js     # Share event tracking & metrics
│   └── userModel.js      # User management & account statuses
├── node_modules/
├── public/
│   ├── css/
│   │   └── style.css     # Preserved CreativeHub design system + admin styling
│   ├── js/
│   │   ├── admin.js      # Admin dashboard controller (Chart.js & filtering)
│   │   ├── main.js       # Global scripts, navbar, post cards & reporting
│   │   └── ...           # Feature-specific client scripts
│   └── uploads/          # Uploaded and seeded creation artwork
├── routes/
│   ├── adminRoutes.js    # Protected administrative endpoints (/api/admin/*)
│   ├── api.js            # Combined API router mounted at /api
│   ├── authRoutes.js
│   ├── challengeRoutes.js
│   ├── collaborationRoutes.js
│   ├── creationRoutes.js
│   ├── index.js          # Web page routes (/admin, /home, etc.)
│   ├── messageRoutes.js
│   ├── notificationRoutes.js
│   ├── searchRoutes.js
│   ├── settingsRoutes.js
│   └── userRoutes.js
├── views/                # EJS view templates
│   ├── admin.ejs         # Admin dashboard & analytics template
│   └── ...               # Campus pages (home, profile, challenges, etc.)
├── postman/              # Postman collection export
├── test_admin_system.js  # Automated test suite (49 test cases)
├── .env                  # Environment configuration
├── .gitignore
├── app.js                # Main application entry point with Socket.IO
├── nodemon.json          # Nodemon live reload configuration
├── package.json          # Dependencies, scripts & test runner
└── README.md
```

---

## How to Run the Application

1. Open VS Code in the `Creative-Hub` folder.
2. Ensure PostgreSQL is running on your machine.
3. Check `.env` configuration (database credentials, port):
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=creative_hub_db
   DB_USER=postgres
   DB_PASS=dekitshomo
   SESSION_SECRET=creativehub_sherubtse_secret_key_2026
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Initialize database and seed sample data:
   ```bash
   npm run init-db
   npm run seed
   ```
6. Run automated test suite:
   ```bash
   npm test
   ```
7. Start the development server with live reload:
   ```bash
   npm run dev
   ```
8. Open **http://localhost:3000** in your browser.

---

## Demo Accounts (Sherubtse College)
All sample accounts use the password `password123`:

| Email | Username | Full Name | Role / Focus |
|---|---|---|---|
| **admin@sherubtse.edu.bt** | **admin** | **Admin User** | **Platform Administrator** |
| sonam@sherubtse.edu.bt | sonam | Sonam Choden | Graphic Design & Digital Media |
| tashi@sherubtse.edu.bt | tashi | Tashi Wangchuk | Campus Photography |
| karma@sherubtse.edu.bt | karmad | Karma Dorji | Traditional Arts & Storytelling |
| pema@sherubtse.edu.bt | pemay | Pema Yangzom | English Literature & Poetry |
| kinley@sherubtse.edu.bt | kinley | Kinley Tshering | Sound & Music Production |

---

## Admin Dashboard & Analytics (`/admin`)

To access the administrator interface:
1. Log in with `admin@sherubtse.edu.bt` / `password123`.
2. Click the **Admin** button in the top navigation bar or navigate to **http://localhost:3000/admin**.

### Key Features:
- **10 Live Database Summary Cards:** Total registered users, active users (period-based with deltas), creations, likes, comments, verified shares, peer follows, new enrollments, and moderation queue count.
- **Statistical Graphs (Chart.js):**
  - **User Growth:** Line chart with cumulative student registrations.
  - **Platform Activity:** Multi-series line chart tracking creations, likes, comments, and shares.
  - **Category Popularity:** Doughnut chart with submission percentages.
  - **Engagement Composition:** Breakdown of likes vs. comments vs. shares.
- **5 Essential Creator Rankings & Leaderboards:**
  1. *Highest Engagement:* Ranked by transparent formula `Likes Received + Comments Received + Tracked Shares Received`.
  2. *Most Posts:* Ranked by published creative works.
  3. *Most Likes Received:* Ranked by total likes received.
  4. *Most Comments Received:* Ranked by total feedback comments received.
  5. *Most Shares:* Ranked by tracked share actions recorded in PostgreSQL.
  - Interactive controls: Top 5, Top 10, Top 20 limits, horizontal bar chart, search filter, and individual creator analytics modals.
- **Creator Comparison Tool:** Select two or more creators to compare head-to-head with grouped bar charts and comparison tables.
- **Content Analytics:** Sortable creative works ranked by engagement, likes, comments, shares, or publication date.
- **User Management:** Search student records, filter by status (active/suspended) and role, and suspend/reactivate accounts with audit logging.
- **Content & Comment Moderation:** Direct review and safe removal of inappropriate works and comments.
- **Reports Queue:** Student-submitted moderation reports with one-click dismissal or atomic resolution with content deletion.
- **Category Management:** CRUD management for creative disciplines with safe cascade reassignment to "Other".

---

## REST API & Postman Collection
Import `postman/CreativeHub_API.postman_collection.json` into Postman to test all endpoints:
- **Auth:** `/api/register`, `/api/login`, `/api/logout`, `/api/me`
- **Admin Dashboard:** `/api/admin/dashboard/overview`, `/api/admin/dashboard/user-growth`, `/api/admin/dashboard/activity`, `/api/admin/dashboard/categories`, `/api/admin/dashboard/engagement`
- **Creator Rankings:** `/api/admin/analytics/rankings`, `/api/admin/analytics/compare`, `/api/admin/analytics/creator/:id`, `/api/admin/analytics/top-posters`, `/api/admin/analytics/top-liked-creators`
- **Content Analytics:** `/api/admin/analytics/content`, `/api/admin/analytics/top-creations`
- **User Management:** `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`
- **Moderation:** `GET /api/admin/reports`, `POST /api/admin/reports/:id/resolve`, `DELETE /api/admin/creations/:id`, `DELETE /api/admin/comments/:id`
- **Categories:** `GET /api/admin/categories`, `POST /api/admin/categories`, `PUT /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`
- **Creations & Sharing:** `/api/creations`, `/api/creations/:id`, `/api/creations/:id/like`, `/api/creations/:id/comments`, `POST /api/creations/:id/share`
- **Challenges:** `/api/challenges`, `/api/challenges/:id/join`, `/api/challenges/:id/participants`
- **Collaborations:** `/api/collaborations`, `/api/collaborations/:id/join`, `/api/collaborations/:id/status`
- **Messages & Social:** `/api/conversations`, `/api/messages`, `/api/users/:id/follow`
- **Settings & Notifications:** `/api/settings/account`, `/api/settings/password`, `/api/notifications`, `/api/search`
