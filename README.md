# CreativeHub — Sherubtse Creative Community App

CreativeHub is a campus-based creative community platform designed for students and faculty of Sherubtse College. The application empowers students across disciplines to showcase their creative works (digital art, photography, graphic design, illustration, literature, music, and video), interact through likes, comments, and real-time messaging, participate in curated creative challenges, assemble cross-functional collaboration teams, and track sharing metrics.

The platform also includes an enterprise-grade **Admin Dashboard, Creator Leaderboard & Analytics System** connected to PostgreSQL, alongside self-healing media persistence, responsive theme management (Light/Dark/System), and an automated test suite.

---

## Technology Stack

- **Backend:** Node.js, Express.js (MVC architecture, RESTful API endpoints)
- **Database:** PostgreSQL with `pg-promise` connection pooling, relational schema, transactions, parameterized queries, and automatic migrations
- **Real-Time Layer:** Socket.IO for live peer-to-peer messaging
- **Frontend & Views:** Vanilla JavaScript (ES6+), Vanilla CSS (custom design system), EJS server-rendered templates, Chart.js for data visualization
- **Authentication & Security:** bcrypt password hashing (cost factor 10), express-session state management, token authentication, and role-based access control (`user` and `admin`)
- **File Management & Streaming:** Multer for file uploads, HTTP 206 Partial Content range request streaming for video/audio, and PostgreSQL bytea self-healing backup storage
- **Testing & Quality Assurance:** Comprehensive test suite (`npm test`) with 92 automated tests across 15 test groups, Postman collection (`postman/CreativeHub_API.postman_collection.json`)

---

## Project Structure & Architecture

```
Creative-Hub/
├── config/
│   ├── db.js                     # PostgreSQL connection pool with pg-promise
│   ├── initDb.js                 # Database schema initializer & automatic migrations
│   └── seed.js                   # Sherubtse demo seed data & administrator accounts
├── controllers/
│   ├── adminController.js        # Admin dashboard analytics, rankings, moderation & categories
│   ├── authController.js         # Authentication, registration, login & session handling
│   ├── challengeController.js    # Creative challenges CRUD & participant workflow
│   ├── collaborationController.js# Creative collaborations & role application workflow
│   ├── creationController.js     # Post creation, feeds, likes, comments & share tracking
│   ├── messageController.js      # Socket.IO & REST real-time messaging
│   ├── notificationController.js # In-app notification delivery & status updates
│   ├── searchController.js       # Search indexing across creators, posts & categories
│   ├── settingsController.js     # User account settings & password updates
│   ├── userController.js         # User profiles, follow/unfollow & public user data
│   └── viewController.js         # EJS template rendering controller
├── middleware/
│   ├── authMiddleware.js         # requireAuth and requireAdmin authorization guards
│   ├── errorMiddleware.js        # Centralized error handler and JSON response standardizer
│   └── uploadMiddleware.js       # Multer storage configuration for images and media attachments
├── models/
│   ├── adminModel.js             # Analytical SQL aggregations, window functions & rankings
│   ├── categoryModel.js          # Category management with safe post reassignment to "Other"
│   ├── challengeModel.js         # Challenge schema, rubric criteria & participant queries
│   ├── collaborationModel.js     # Collaboration specifications, roles & join requests
│   ├── creationModel.js          # Creation posts, media metadata, likes & comments
│   ├── messageModel.js           # Direct conversations & message history persistence
│   ├── notificationModel.js      # Notification records and unread badge counts
│   ├── reportModel.js            # Content reports queue and atomic resolution
│   ├── schema.sql                # Complete PostgreSQL DDL schema definition
│   ├── shareModel.js             # Share event tracking & metric aggregations
│   └── userModel.js              # Student profiles, roles, account statuses & credentials
├── public/
│   ├── css/
│   │   └── style.css             # Unified CreativeHub design system (light/dark themes, components)
│   ├── js/
│   │   ├── admin.js              # Admin dashboard controller (Chart.js charts & filtering)
│   │   ├── applications.js       # User application tracker (challenge & collab submissions)
│   │   ├── auth.js               # Client-side login, registration & validation
│   │   ├── challenge-details.js  # Challenge page, requirements & submission handling
│   │   ├── challenges.js         # Challenges grid & active contest browsing
│   │   ├── collaboration-details.js # Collaboration details, team roles & audio playback
│   │   ├── collaboration.js      # Projects board & creator recruitment listings
│   │   ├── connect.js            # Creator directory, search & follow actions
│   │   ├── create.js             # Work submission form with media upload preview
│   │   ├── creation-details.js   # Single creation view, comments, likes & share counter
│   │   ├── home.js               # Campus feed, category chips & infinite-style feed
│   │   ├── main.js               # Global client runtime, navbar, avatar helper & utilities
│   │   ├── messages.js           # Real-time chat interface & contact accents
│   │   ├── profile.js            # Distinct user profile hero, bio & work gallery
│   │   ├── search.js             # Global multi-entity search results page
│   │   └── settings.js           # Account settings, theme selector & password changes
│   └── uploads/                  # Ephemeral & self-healed media uploads
├── routes/
│   ├── adminRoutes.js            # Protected administrative endpoints (/api/admin/*)
│   ├── api.js                    # Primary API router mounting all modular resource routes
│   ├── authRoutes.js             # Authentication endpoints (/api/auth/*)
│   ├── challengeRoutes.js        # Challenge management endpoints (/api/challenges/*)
│   ├── collaborationRoutes.js    # Collaboration endpoints (/api/collaborations/*)
│   ├── creationRoutes.js         # Creations, likes, comments & shares (/api/creations/*)
│   ├── index.js                  # Frontend web page routes (/home, /profile, /settings, etc.)
│   ├── messageRoutes.js          # Direct messaging & conversation endpoints (/api/messages/*)
│   ├── notificationRoutes.js     # Notification polling & read status (/api/notifications/*)
│   ├── searchRoutes.js           # Search API endpoints (/api/search/*)
│   ├── settingsRoutes.js         # Settings & password endpoints (/api/settings/*)
│   └── userRoutes.js             # User directory & profile endpoints (/api/users/*)
├── views/
│   ├── admin.ejs                 # Administrative dashboard & analytics interface
│   ├── applications.ejs          # Unified applications tracking dashboard
│   ├── challenge-details.ejs     # Challenge specifications, guidelines & submission modal
│   ├── challenges.ejs            # Campus contests & creative challenges listing
│   ├── collaboration-details.ejs # Team recruitment details, audio demo & role specs
│   ├── collaboration.ejs         # Student collaboration opportunities board
│   ├── connect.ejs               # Campus creator directory & discovery
│   ├── create.ejs                # Upload & publish creative artwork
│   ├── creation-details.ejs      # Creation view, comment thread & engagement actions
│   ├── forgot-password.ejs       # Password recovery request form
│   ├── home.ejs                  # Campus home feed & Sherubtse clock tower hero
│   ├── index.ejs                 # Welcome / landing page for guest visitors
│   ├── login.ejs                 # Student login portal
│   ├── messages.ejs              # Real-time private messaging interface
│   ├── profile.ejs               # User profile, banner, bio, stats & creation grid
│   ├── register.ejs              # Student account registration portal
│   ├── reset-password.ejs        # Secure password reset completion form
│   ├── search.ejs                # Search results page for posts, people & categories
│   ├── settings.ejs              # User account & appearance / theme customization
│   └── verify-email.ejs          # Email verification confirmation page
├── postman/
│   └── CreativeHub_API.postman_collection.json # Comprehensive Postman API collection
├── test_admin_system.js          # 92-test automated regression & feature test suite
├── .env                          # Local environment variables & DB credentials
├── .gitignore                    # Git ignore file (node_modules, uploads, logs)
├── app.js                        # Express server entry point & Socket.IO server setup
├── nodemon.json                  # Nodemon live reload configuration
├── package.json                  # Project dependencies, scripts & configuration
└── README.md                     # Application documentation
```

---

## Core Application Modules & Recent Enhancements

### 1. Centered Profile Avatar & Default Initial System
- **Dead-Center Initial Display:** When users have not uploaded a profile picture, a crisp, uppercase first initial is rendered in the exact center of the circular avatar badge.
- **CSS Specificity Resolution:** Eliminated unintended `display: block` overrides from wrapper classes and enforced `display: inline-flex !important; align-items: center; justify-content: center; line-height: 1;` across all avatar sizes (`small`, standard, `large`, and `big`).
- **Cache-Busting & Dev Headers:** Integrated asset version query parameters (`?v=2`) and `Cache-Control: no-cache, must-revalidate` headers in development mode to prevent stale browser caching of stylesheets and client scripts.
- **Clean Fallback Handling:** Automatic graceful degradation to the centered initial if an image URL fails to load (`onerror`).

### 2. Appearance & Theme Engine (Light / Dark / System Auto)
- **Three Display Themes:** Light daylight theme with crisp blue accents, obsidian Dark Mode designed to prevent eye fatigue, and System Auto mode synchronizing with device OS preferences.
- **Universal Synchronization:** Active across all 20 views, persisted locally in `localStorage`, and controllable via interactive cards in `/settings` or quick navbar toggle.

### 3. Applications & Review Workflow Dashboard (`/applications`)
- **Centralized Submissions Hub:** Dedicated dashboard for students to track status across both **Creative Challenges** and **Collaboration Projects**.
- **Real-Time Status Badges:** Visual indicators for `Pending`, `Under Review`, `Accepted`, and `Rejected` statuses.
- **Reviewer Feedback:** Displays custom review notes and organizer decision messages with the ability to withdraw active applications.

### 4. Self-Healing Media Storage & Streaming
- **HTTP 206 Partial Content Range Requests:** Smooth scrubbing, seeking, and playback for student audio demos (`.mp3`, `.wav`) and video reels (`.mp4`, `.webm`).
- **PostgreSQL Bytea Backup:** Automatically recovers uploaded media from database records if ephemeral container disks are cleared upon restart.

### 5. Multi-Format Creation Uploads (Photos, Videos, Audio, Documents & Links)
- **Rich Media Types:** Support for Photos (`.jpg`, `.png`, `.gif`, `.webp`), Videos (`.mp4`, `.webm`, `.mov`, `.mkv`), Audio recordings (`.mp3`, `.wav`, `.ogg`, `.m4a`), Documents (`.pdf`, Word `.doc`/`.docx`, `.txt`, `.ppt`/`.pptx`, `.xls`/`.xlsx`), and External Web Links.
- **Documents Support:** Creators can upload PDFs, academic papers, and Word documents with dedicated document badges, file size indicators, direct in-browser viewing, and download buttons.
- **External Links & Portfolios:** Creators can share external project links (GitHub, Behance, Figma, Google Drive, Notion, portfolios) with or without custom cover images, complete with automatic domain extraction and direct "Visit" buttons.
- **Live Interactive Previews:** Real-time preview generator on the creation page displaying file details or web domain cards before publishing.

### 6. Real-Time Socket.IO Direct Messaging
- Instant bidirectional communication between student creators.
- Contact accents: deterministic, stable color rings generated per contact for effortless chat scanning.
- Visual read states, unread counters, and conversation navigation.

### 7. Full Admin Dashboard & Creator Analytics (`/admin`)
- **10 Database KPI Cards:** Real-time metrics for users, creations, likes, comments, shares, follows, registrations, and moderation queue.
- **Interactive Chart.js Visualizations:** User growth curves, multi-metric platform activity, category distribution, and engagement composition.
- **5 Creator Rankings:** Highest Engagement, Most Posts, Most Likes, Most Comments, and Most Shares with comparison tools.
- **Moderation Queue:** Student-submitted reports queue with one-click resolution and content removal.

---

## Setup & Running Locally

### Prerequisites
- **Node.js** (v18.x or higher)
- **PostgreSQL** (v14.x or higher) running locally or remotely

### 1. Configure Environment Variables
Create or verify `.env` in the project root:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=creative_hub_db
DB_USER=postgres
DB_PASS=your_postgres_password
SESSION_SECRET=creativehub_sherubtse_secret_key_2026
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize & Seed the Database
```bash
# Run schema migrations and create all tables
npm run init-db

# Populate default categories, Sherubtse student profiles, and sample creations
npm run seed
```

### 4. Run the Automated Test Suite
```bash
npm test
```
The test suite validates 92 assertions covering authentication, permissions, analytics calculations, media recovery, challenge applications, collaboration attachments, and moderation.

### 5. Launch the Server
```bash
# Production mode
npm start

# Development mode with live reload
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Demo Accounts (Sherubtse College)

All seeded accounts share the default development password: `password123`

| Email | Username | Full Name | Role / Specialty |
|---|---|---|---|
| **admin@sherubtse.edu.bt** | **admin** | **Sherubtse Administrator** | **System Administrator** |
| sonam@sherubtse.edu.bt | sonam | Sonam Choden | Graphic Design & Digital Media |
| tashi@sherubtse.edu.bt | tashi | Tashi Wangchuk | Campus Photography |
| karma@sherubtse.edu.bt | karmad | Karma Dorji | Traditional Bhutanese Art |
| pemay@sherubtse.edu.bt | pemay | Pema Yangzom | Literature, Poetry & Essays |
| kinley@sherubtse.edu.bt | kinley | Kinley Tshering | Sound, Beats & Audio Production |

---

## Automated Test Suite Summary (100 Tests)

The automated test runner (`npm test` / `test_admin_system.js`) validates 16 distinct functional groups:

1. **Authentication, Registration & Role-Based Access:** Session tokens, admin authorization, and 403 enforcement.
2. **Dashboard Overview Statistics:** Verification of DB aggregations against raw SQL counts.
3. **Statistical & Graphical Series:** Time-series user growth, multi-series activity, category distribution, and engagement breakdown.
4. **5 Essential Creator Rankings:** Correct sorting by engagement formula, post count, likes, comments, and shares.
5. **Creator Comparison & Individual Analytics:** Side-by-side creator comparisons and secret/password masking.
6. **Content Analytics & Popular Posts:** Post rankings and total engagement formulas.
7. **User Management & Suspension:** Account suspension, login blocking, reactivation, and duplicate checks.
8. **Content Moderation & Reports Queue:** Report submissions, queue management, resolution notes, and audit logs.
9. **Category Management:** CRUD operations and safe cascade reassignment to "Other".
10. **Share Tracking:** Metric updates and persistent audit logging in `share_events`.
11. **User Post Deletion & Permissions:** Ownership checks and safe database removal.
12. **Password Recovery & Reset Flow:** Token generation, email notification simulation, and password changes.
13. **Challenge Details & Application Workflow:** Rich challenge criteria, rubric data, student applications, and acceptance flow.
14. **Collaboration Details & Application Workflow:** Team position requirements, audio demo attachments, streaming verification, and status updates.
15. **My Applications Dashboard & Status Tracking:** Application aggregation, reviewer feedback display, and graceful withdrawal.
16. **Document & Link Creation Workflow:** PDF document upload, self-healing recovery, link-only creations, and file metadata.

---

## License & Attribution

Developed for the **Sherubtse College Creative Community**, Royal University of Bhutan. All rights reserved.
