# NeuroX — Full-Stack Next.js Application Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Migration Summary (React Vite → Next.js)](#2-migration-summary)
3. [Tech Stack](#3-tech-stack)
4. [Folder Structure](#4-folder-structure)
5. [Setup & Installation](#5-setup--installation)
6. [Environment Variables](#6-environment-variables)
7. [Database Schema](#7-database-schema)
8. [Database Connection (lib/db.js)](#8-database-connection)
9. [Backend API Routes](#9-backend-api-routes)
10. [Frontend Services Layer](#10-frontend-services-layer)
11. [Custom Hooks](#11-custom-hooks)
12. [Page-by-Page Breakdown](#12-page-by-page-breakdown)
13. [Components](#13-components)
14. [Routing Changes](#14-routing-changes)
15. [What Was Removed](#15-what-was-removed)
16. [What Was Added](#16-what-was-added)
17. [How to Run](#17-how-to-run)
18. [How to Test API Routes](#18-how-to-test-api-routes)

---

## 1. Project Overview

NeuroX is a **Design Thinking Platform** that helps designers and managers create projects, use templates across design thinking stages (Empathize, Define, Ideate, Prototype, Test, Implement, Adopt), book sessions with experts, and manage documents.

The application was originally a **React (Vite)** frontend-only app that called an external API at `http://localhost:7071/api`. It has been converted into a **full-stack Next.js application** where:

- The **frontend** uses Next.js App Router with file-based routing.
- The **backend** uses Next.js API routes (`/app/api/*`).
- The **database** connects directly to Azure SQL using the `mssql` npm package.

---

## 2. Migration Summary

### What Changed

| Aspect | Before (React Vite) | After (Next.js) |
|--------|---------------------|------------------|
| **Framework** | React 18 + Vite 6 | Next.js 15 (App Router) |
| **Routing** | State-driven (`activeNav` in App.jsx) | File-based (`/app/page.js`, `/app/projects/page.js`, etc.) |
| **Backend** | External API at `localhost:7071` | Built-in Next.js API routes at `/app/api/*` |
| **Database** | None (relied on external backend) | Azure SQL via `mssql` package |
| **Entry Point** | Single `App.jsx` (1,444 lines) | Split across multiple page files and components |
| **Navigation** | `setState()` calls to switch views | `next/navigation` with `Link` and `useRouter` |
| **Images** | `figma:asset/...` Vite plugin imports | Standard URLs and `<img>` tags |
| **Build Tool** | Vite | Next.js built-in (Turbopack/Webpack) |
| **CSS** | Pre-compiled Tailwind v4 in `index.css` | Tailwind v4 via `@tailwindcss/postcss` plugin |
| **Supabase** | Client files existed but unused | Removed entirely |
| **State Management** | All in `App.jsx` with `useState` | Split: AppShell handles auth/modals, pages handle their own data |

### Files Migrated

| Original File | New Location | Notes |
|---------------|--------------|-------|
| `src/App.jsx` | `components/AppShell.jsx` + individual pages | 1,444-line file split into ~10 files |
| `src/pages/Login.jsx` | `app/login/page.js` | Now a proper Next.js route |
| `src/pages/ManagerHome.jsx` | `components/ManagerHome.jsx` | Stays a component, used in home page |
| `src/pages/Templates.jsx` | `app/templates/page.js` | Now a proper Next.js route |
| `src/pages/Experts.jsx` | `app/experts/page.js` | Now a proper Next.js route |
| `src/pages/Session.jsx` | `app/sessions/page.js` | Now a proper Next.js route |
| `src/pages/ProjectDetail.jsx` | `app/projects/[id]/page.js` | Dynamic route with project ID |
| `src/pages/CreateProjectModal.jsx` | `components/modals/CreateProjectModal.jsx` | Moved to modals folder |
| `src/pages/ProfileModal.jsx` | `components/modals/ProfileModal.jsx` | Moved to modals folder |
| `src/pages/EditProfileModal.jsx` | `components/modals/EditProfileModal.jsx` | Moved to modals folder |
| `src/services/api.js` | `services/api.js` | Rewritten to call `/api/*` instead of `localhost:7071` |
| `src/hooks/*` | `hooks/*` | Minor updates, added `"use client"` directive |
| `src/imports/Frame13.jsx` | `components/Logo.jsx` | Simplified, no Figma imports |
| `src/components/figma/ImageWithFallback.jsx` | `components/ImageWithFallback.jsx` | Added `"use client"` directive |

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 15.3.1 |
| UI Library | React | 19.1.0 |
| Language | JavaScript (ES Modules) | — |
| CSS Framework | Tailwind CSS | 4.1.4 |
| Icons | Lucide React | 0.487.0 |
| Database | Azure SQL Database | — |
| DB Driver | mssql | 11.0.1 |
| CSS Utilities | clsx, tailwind-merge, class-variance-authority | — |

### Dependencies (package.json)

**Production:**
- `next` — Framework
- `react`, `react-dom` — UI library
- `mssql` — Azure SQL database driver
- `lucide-react` — Icon library
- `clsx`, `tailwind-merge`, `class-variance-authority` — CSS utility helpers

**Development:**
- `tailwindcss`, `@tailwindcss/postcss`, `postcss` — CSS build pipeline

---

## 4. Folder Structure

```
neurox-nextjs/
│
├── app/                              # Next.js App Router (pages + API)
│   ├── layout.js                     # Root HTML layout
│   ├── template.js                   # AppShell wrapper (sidebar + header)
│   ├── globals.css                   # Tailwind imports + custom styles
│   ├── page.js                       # Home page (/ route)
│   │
│   ├── login/
│   │   └── page.js                   # Login page (/login)
│   │
│   ├── projects/
│   │   ├── page.js                   # All Projects page (/projects)
│   │   └── [id]/
│   │       └── page.js               # Project Detail (/projects/:id)
│   │
│   ├── templates/
│   │   └── page.js                   # Templates page (/templates)
│   │
│   ├── experts/
│   │   └── page.js                   # Experts page (/experts)
│   │
│   ├── sessions/
│   │   └── page.js                   # Sessions page (/sessions)
│   │
│   └── api/                          # Backend API routes
│       ├── users/route.js            # /api/users
│       ├── projects/route.js         # /api/projects
│       ├── documents/route.js        # /api/documents
│       ├── templates/route.js        # /api/templates
│       ├── bookings/route.js         # /api/bookings
│       ├── experts/route.js          # /api/experts
│       └── stages/route.js           # /api/stages
│
├── lib/
│   └── db.js                         # Azure SQL connection pool (mssql)
│
├── components/
│   ├── AppShell.jsx                  # Main app wrapper (auth, sidebar, header, modals)
│   ├── Sidebar.jsx                   # Left navigation sidebar
│   ├── Header.jsx                    # Top header bar
│   ├── Logo.jsx                      # NeuroX SVG logo
│   ├── ImageWithFallback.jsx         # Image component with error fallback
│   ├── ManagerHome.jsx               # Manager dashboard view
│   └── modals/
│       ├── CreateProjectModal.jsx    # Create/Edit project modal
│       ├── ProfileModal.jsx          # View profile modal
│       └── EditProfileModal.jsx      # Edit profile modal
│
├── hooks/
│   ├── useCurrentUser.js             # Fetch and update current user
│   ├── useProjects.js                # Full CRUD for projects
│   ├── useExperts.js                 # Fetch experts list
│   ├── useTemplatesSummary.js        # Template count per stage
│   └── useDocuments.js               # Fetch user documents
│
├── services/
│   └── api.js                        # Frontend API client (calls /api/*)
│
├── public/                           # Static assets
├── .env.example                      # Environment variable template
├── .env.local                        # Local environment (fill in DB creds)
├── package.json                      # Dependencies and scripts
├── next.config.mjs                   # Next.js configuration
├── postcss.config.mjs                # PostCSS config (Tailwind)
├── jsconfig.json                     # Path aliases (@/*)
└── DOCUMENTATION.md                  # This file
```

---

## 5. Setup & Installation

### Prerequisites
- Node.js 18+ installed
- An Azure SQL Database with the tables created (see Section 7)
- Database credentials ready

### Steps

```bash
# 1. Navigate to the project folder
cd neurox-nextjs

# 2. Install dependencies
npm install

# 3. Set up environment variables
#    Edit .env.local and fill in your Azure SQL credentials
#    (See Section 6 below)

# 4. Start the development server
npm run dev

# 5. Open in browser
#    http://localhost:3000
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

---

## 6. Environment Variables

File: `.env.local` (create from `.env.example`)

```env
# Azure SQL Database Connection
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_SERVER=your_server.database.windows.net
DB_NAME=your_database_name

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | Azure SQL login username | `neurox_admin` |
| `DB_PASSWORD` | Azure SQL login password | `MyP@ssw0rd123` |
| `DB_SERVER` | Azure SQL server hostname | `neurox-server.database.windows.net` |
| `DB_NAME` | Database name | `neurox_db` |

**Important:** Never commit `.env.local` to version control. The `.env.example` file is safe to commit as a template.

---

## 7. Database Schema

### 10 Tables

#### 1. users
```sql
CREATE TABLE users (
    user_id       NVARCHAR(255) PRIMARY KEY,
    name          NVARCHAR(255),
    email         NVARCHAR(255),
    role          NVARCHAR(50),
    created_at    DATETIME DEFAULT GETDATE()
);
```

#### 2. projects
```sql
CREATE TABLE projects (
    project_id             NVARCHAR(255) PRIMARY KEY,
    project_name           NVARCHAR(255),
    project_description    NVARCHAR(MAX),
    owner_user_id          NVARCHAR(255) REFERENCES users(user_id),
    status                 NVARCHAR(50),
    client                 NVARCHAR(255),
    start_date             DATETIME,
    target_completion_date DATETIME,
    created_at             DATETIME DEFAULT GETDATE(),
    updated_at             DATETIME DEFAULT GETDATE()
);
```

#### 3. stages
```sql
CREATE TABLE stages (
    stage_id        NVARCHAR(255) PRIMARY KEY,
    stage_name      NVARCHAR(255),
    sequence_order  INT
);
```

#### 4. templates
```sql
CREATE TABLE templates (
    template_id    NVARCHAR(255) PRIMARY KEY,
    template_name  NVARCHAR(255),
    blob_path      NVARCHAR(500),
    version        NVARCHAR(50),
    stage_id       NVARCHAR(255) REFERENCES stages(stage_id)
);
```

#### 5. documents
```sql
CREATE TABLE documents (
    document_id   NVARCHAR(255) PRIMARY KEY,
    user_id       NVARCHAR(255) REFERENCES users(user_id),
    template_id   NVARCHAR(255) REFERENCES templates(template_id),
    blob_path     NVARCHAR(500),
    status        NVARCHAR(50),
    stage_id      NVARCHAR(255) REFERENCES stages(stage_id),
    project_id    NVARCHAR(255) REFERENCES projects(project_id),
    created_at    DATETIME DEFAULT GETDATE(),
    updated_at    DATETIME DEFAULT GETDATE()
);
```

#### 6. experts
```sql
CREATE TABLE experts (
    expert_id            NVARCHAR(255) PRIMARY KEY,
    name                 NVARCHAR(255),
    description          NVARCHAR(MAX),
    email                NVARCHAR(255),
    years_of_experience  INT
);
```

#### 7. skills
```sql
CREATE TABLE skills (
    skill_id    NVARCHAR(255) PRIMARY KEY,
    skill_name  NVARCHAR(255)
);
```

#### 8. expert_skills (junction table)
```sql
CREATE TABLE expert_skills (
    expert_id  NVARCHAR(255) REFERENCES experts(expert_id),
    skill_id   NVARCHAR(255) REFERENCES skills(skill_id),
    PRIMARY KEY (expert_id, skill_id)
);
```

#### 9. bookings
```sql
CREATE TABLE bookings (
    booking_id        NVARCHAR(255) PRIMARY KEY,
    expert_id         NVARCHAR(255) REFERENCES experts(expert_id),
    user_id           NVARCHAR(255) REFERENCES users(user_id),
    booking_datetime  DATETIME,
    description       NVARCHAR(MAX),
    status            NVARCHAR(50),
    created_at        DATETIME DEFAULT GETDATE()
);
```

#### 10. project_users (junction table)
```sql
CREATE TABLE project_users (
    project_id  NVARCHAR(255) REFERENCES projects(project_id),
    user_id     NVARCHAR(255) REFERENCES users(user_id),
    role        NVARCHAR(50),
    added_at    DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (project_id, user_id)
);
```

---

## 8. Database Connection

**File:** `lib/db.js`

Uses the `mssql` npm package to connect to Azure SQL Database. Implements a **singleton connection pool** pattern — the pool is created once and reused across all API route requests.

**How it works:**
1. Reads credentials from environment variables (`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`).
2. Creates a connection with `encrypt: true` (required by Azure SQL).
3. Exports `getPool()` — returns the existing pool or creates a new one.
4. Exports `sql` — for SQL data types used in parameterized queries.

**Usage in API routes:**
```javascript
import { getPool, sql } from "@/lib/db";

const pool = await getPool();
const result = await pool
  .request()
  .input("userId", sql.NVarChar, "u")
  .query("SELECT * FROM users WHERE user_id = @userId");
```

**Key points:**
- All queries use **parameterized inputs** (`@paramName`) to prevent SQL injection.
- The pool is **reused** across requests for performance.
- Errors are caught and logged to the console.

---

## 9. Backend API Routes

All API routes are in `/app/api/` and follow Next.js App Router conventions. Each `route.js` file exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`).

### Response Format

All endpoints return JSON in this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": { "message": "Error description" }
}
```

---

### 9.1 Users API — `/api/users`

**File:** `app/api/users/route.js`

| Method | URL | Description | Query Params | Body |
|--------|-----|-------------|--------------|------|
| GET | `/api/users` | Get all users | — | — |
| GET | `/api/users?userId=u` | Get single user | `userId` | — |
| POST | `/api/users` | Create a user | — | `{ userId, name, email, role }` |
| PUT | `/api/users?userId=u` | Update a user | `userId` (requester) | `{ userId, name, email, role }` |

**SQL queries used:**
- `SELECT * FROM users` — all users
- `SELECT * FROM users WHERE user_id = @userId` — single user
- `INSERT INTO users (user_id, name, email, role, created_at) VALUES (...)` — create
- `UPDATE users SET name=@name, email=@email, role=@role WHERE user_id=@userId` — update

---

### 9.2 Projects API — `/api/projects`

**File:** `app/api/projects/route.js`

| Method | URL | Description | Query Params | Body |
|--------|-----|-------------|--------------|------|
| GET | `/api/projects` | Get all projects | — | — |
| GET | `/api/projects?projectId=xxx` | Get one project | `projectId` | — |
| POST | `/api/projects?userId=u` | Create project | `userId` | `{ projectId, projectName, projectDescription, status, client, startDate, targetCompletionDate }` |
| PUT | `/api/projects?projectId=xxx` | Update project | `projectId` | `{ projectName, projectDescription, status, client, startDate, targetCompletionDate }` |
| DELETE | `/api/projects?projectId=xxx` | Delete project | `projectId` | — |

**SQL queries used:**
- `SELECT * FROM projects ORDER BY created_at DESC`
- `SELECT * FROM projects WHERE project_id = @projectId`
- `INSERT INTO projects (...) VALUES (...)`
- `UPDATE projects SET ... WHERE project_id = @projectId`
- `DELETE FROM projects WHERE project_id = @projectId`

---

### 9.3 Documents API — `/api/documents`

**File:** `app/api/documents/route.js`

| Method | URL | Description | Query Params | Body |
|--------|-----|-------------|--------------|------|
| GET | `/api/documents?userId=u` | Get user's documents | `userId`, `projectId` (optional) | — |
| POST | `/api/documents` | Create document record | — | `{ documentId, userId, templateId, blobPath, status, stageId, projectId }` |
| DELETE | `/api/documents?documentId=xxx` | Delete a document | `documentId` | — |

**SQL queries used:**
- `SELECT * FROM documents WHERE user_id = @userId` (dynamic filter)
- `INSERT INTO documents (...) VALUES (...)`
- `DELETE FROM documents WHERE document_id = @documentId`

---

### 9.4 Templates API — `/api/templates`

**File:** `app/api/templates/route.js`

| Method | URL | Description | Query Params |
|--------|-----|-------------|--------------|
| GET | `/api/templates` | Get all templates | — |
| GET | `/api/templates?stageId=empathize` | Get templates by stage | `stageId` |
| GET | `/api/templates?templateId=xxx` | Get single template | `templateId` |
| GET | `/api/templates?summary=true` | Get template count per stage | `summary=true` |

**SQL queries used:**
- `SELECT * FROM templates`
- `SELECT * FROM templates WHERE stage_id = @stageId`
- `SELECT * FROM templates WHERE template_id = @templateId`
- `SELECT stage_id, COUNT(*) AS templateCount FROM templates GROUP BY stage_id`

---

### 9.5 Bookings API — `/api/bookings`

**File:** `app/api/bookings/route.js`

| Method | URL | Description | Query Params | Body |
|--------|-----|-------------|--------------|------|
| GET | `/api/bookings?expertId=xxx&userId=u` | Get bookings | `expertId`, `userId` (both optional) | — |
| POST | `/api/bookings?userId=u` | Create booking | `userId` | `{ expertId, bookingDateTime, description }` |

**SQL queries used:**
- `SELECT * FROM bookings WHERE ...` (dynamic filter by expertId/userId)
- `INSERT INTO bookings (...) VALUES (...)`

---

### 9.6 Experts API — `/api/experts`

**File:** `app/api/experts/route.js`

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/experts` | Get all experts with their skills |

**SQL queries used:**
- `SELECT * FROM experts ORDER BY name`
- `SELECT es.expert_id, s.skill_name FROM expert_skills es JOIN skills s ON es.skill_id = s.skill_id`

This route performs two queries and joins the results in JavaScript to return each expert with their skills array.

---

### 9.7 Stages API — `/api/stages`

**File:** `app/api/stages/route.js`

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/stages` | Get all design thinking stages |

**SQL query used:**
- `SELECT * FROM stages ORDER BY sequence_order ASC`

---

## 10. Frontend Services Layer

**File:** `services/api.js`

This is the **frontend API client** that all React components and hooks use to call the backend. It replaces the old `services/api.js` which pointed to `http://localhost:7071/api`.

**Base URL:** `/api` (relative — calls the same Next.js server)

**Key change from old code:**
- Old: `fetch("http://localhost:7071/api/get_projects")`
- New: `fetch("/api/projects")`

### Available Methods

| Method | Old Endpoint | New Endpoint |
|--------|-------------|--------------|
| `api.getCurrentUser(userId)` | `GET /get_current_user?userId=` | `GET /api/users?userId=` |
| `api.updateUser(...)` | `PUT /update_user?userId=` | `PUT /api/users?userId=` |
| `api.getStages()` | `GET /get_stages` | `GET /api/stages` |
| `api.getTemplatesByStage(stageId)` | `GET /templates/stage/{stageId}` | `GET /api/templates?stageId=` |
| `api.getTemplateById(id)` | `GET /templates/template/{id}` | `GET /api/templates?templateId=` |
| `api.getTemplatesSummary()` | `GET /get_templates/summary` | `GET /api/templates?summary=true` |
| `api.getDocuments(userId)` | `GET /get_documents?userId=` | `GET /api/documents?userId=` |
| `api.createDocument(data)` | — | `POST /api/documents` |
| `api.deleteDocument(id)` | `DELETE /delete_document/{id}` | `DELETE /api/documents?documentId=` |
| `api.getExperts()` | `GET /get_experts` | `GET /api/experts` |
| `api.createBooking(data, userId)` | `POST /post_bookings?userId=` | `POST /api/bookings?userId=` |
| `api.getBookingsByExpert(...)` | `GET /get_bookings_by_expert/{id}` | `GET /api/bookings?expertId=` |
| `api.getProjects()` | `GET /get_projects` | `GET /api/projects` |
| `api.getProjectById(id)` | `GET /get_project_by_id?projectId=` | `GET /api/projects?projectId=` |
| `api.createProject(data, userId)` | `POST /create_project?userId=` | `POST /api/projects?userId=` |
| `api.updateProject(...)` | `PUT /update_project?projectId=` | `PUT /api/projects?projectId=` |
| `api.deleteProject(id, userId)` | `DELETE /delete_project/{id}` | `DELETE /api/projects?projectId=` |

---

## 11. Custom Hooks

All hooks are in the `hooks/` folder and use the `"use client"` directive.

### useCurrentUser.js
- **Purpose:** Fetch and update the currently logged-in user's profile.
- **Parameters:** `userId` (string)
- **Returns:** `{ userData, isLoading, error, isUpdating, updateUser, refetch }`
- **API calls:** `api.getCurrentUser()`, `api.updateUser()`

### useProjects.js
- **Purpose:** Full CRUD operations for projects.
- **Parameters:** `userId` (string)
- **Returns:** `{ projects, isLoading, error, refetch, currentProject, isLoadingProject, projectError, fetchProjectById, updateProject, updateLoading, deleteProject, deleteLoading }`
- **API calls:** `api.getProjects()`, `api.getProjectById()`, `api.updateProject()`, `api.deleteProject()`

### useExperts.js
- **Purpose:** Fetch the list of experts and map them to UI format.
- **Returns:** `{ experts, isLoading, error, refetch }`
- **API calls:** `api.getExperts()`
- **Note:** Maps API data to include `gradient`, `image`, `skills` for display.

### useTemplatesSummary.js
- **Purpose:** Fetch template count per design thinking stage.
- **Returns:** `{ summary, isLoading, error, refetch }`
- **API calls:** `api.getTemplatesSummary()`
- **Note:** Returns an object like `{ empathize: 3, define: 2, ... }`

### useDocuments.js
- **Purpose:** Fetch documents for a user.
- **Parameters:** `userId` (string)
- **Returns:** `{ documents, isLoading, error, refetch }`
- **API calls:** `api.getDocuments()`

---

## 12. Page-by-Page Breakdown

### /login — Login Page
- **File:** `app/login/page.js`
- **Purpose:** Role selection (Designer or Manager) login screen.
- **How it works:** User selects a role, clicks "Continue". The role and a test userId are stored in `localStorage`. Then navigates to `/`.
- **No backend call** — uses localStorage for session.

### / — Home Page
- **File:** `app/page.js`
- **Purpose:** Dashboard with two views:
  - **Designer view:** Recent projects grid + Design thinking stages + Feature cards (Book Expert, Knowledge Repo).
  - **Manager view:** Stats cards + Clients list + Upcoming expert sessions.
- **Data sources:** `useProjects`, `useTemplatesSummary`, `api.getStages()`
- **Navigation:** Clicking a project → `/projects/{id}`, clicking a stage → `/templates?stage=StageName`

### /projects — All Projects
- **File:** `app/projects/page.js`
- **Purpose:** Grid of all projects with gradient cards. Each card shows title, client, status, start date.
- **Features:** Context menu (three dots) with Delete option.
- **Data source:** `useProjects`
- **Navigation:** Clicking a card → `/projects/{id}`

### /projects/[id] — Project Detail
- **File:** `app/projects/[id]/page.js`
- **Purpose:** Shows project header (name, description, client, target date) and expandable design thinking stages. Each stage has templates where users can upload documents.
- **Features:**
  - 6 stages: Empathize, Define, Ideate, Prototype, Test, Implement
  - Each stage expandable with templates
  - File upload buttons per template
  - Shows existing API documents with download/delete
  - "Mark as Complete" checkbox
- **Data sources:** `api.getProjectById()`, `api.getDocuments()`

### /templates — Templates
- **File:** `app/templates/page.js`
- **Purpose:** Browse templates organized by design thinking stages.
- **Features:**
  - Filter tabs: All, Empathize, Define, Ideate, Prototype, Test, Implement, Adopt
  - Template cards with image, name, stage, description, version
  - "Use Template" and "Download" buttons
- **Data sources:** `api.getStages()`, `api.getTemplatesByStage()`
- **URL params:** Accepts `?stage=StageName` to pre-select a filter tab.

### /experts — Experts
- **File:** `app/experts/page.js`
- **Purpose:** Browse design thinking experts and book sessions.
- **Features:**
  - Expert cards with photo, name, experience, skills
  - Filter dropdown by skill
  - Booking popup modal (date picker, time slot selector, description)
- **Data sources:** `useExperts`, `api.createBooking()`

### /sessions — Sessions
- **File:** `app/sessions/page.js`
- **Purpose:** View upcoming and past expert sessions.
- **Features:**
  - Filter tabs: All, Upcoming, Past
  - Session cards with image, expert info, date/time, location, participants
  - Join Session / View Recording buttons
- **Data source:** Currently uses mock data (can be connected to bookings API).

---

## 13. Components

### AppShell (`components/AppShell.jsx`)
The main wrapper component rendered by `app/template.js`. It:
- Checks `localStorage` for existing session on mount
- Redirects to `/login` if not authenticated
- Renders the Sidebar + Header around page content
- Manages modals (Create Project, View Profile, Edit Profile)
- Handles project creation and profile update logic
- Skips the shell when on the `/login` page

### Sidebar (`components/Sidebar.jsx`)
- Fixed left sidebar (240px wide)
- Logo at top
- Navigation links: Home, Projects, Templates, Experts, Sessions
- Settings and Logout buttons at bottom
- Active state based on current URL path (`usePathname`)

### Header (`components/Header.jsx`)
- Sticky top header
- Search input
- "Create New Project" button
- Notification bell
- Profile avatar dropdown (View Profile option)

### Logo (`components/Logo.jsx`)
- NeuroX brand logo (purple circle with dots SVG + "NEUROX" text)
- Replaces the old `Frame13.jsx` Figma import

### ImageWithFallback (`components/ImageWithFallback.jsx`)
- `<img>` tag that shows a placeholder SVG if the image fails to load
- Used for expert profile photos

### ManagerHome (`components/ManagerHome.jsx`)
- Manager-specific dashboard with stats cards, client breakdown, and upcoming sessions
- Rendered inside the home page when `userRole === "Manager"`

### Modals
- **CreateProjectModal** — Form with fields: Project Name, Client, Description, Start Date, Target Date, Share With. Supports both Create and Edit modes.
- **ProfileModal** — Read-only profile view with name, email, role, member since, account status.
- **EditProfileModal** — Editable form with name, email, role. Includes validation.

---

## 14. Routing Changes

### Old Routing (React Vite — state-driven)

```
App.jsx manages a single state variable: activeNav
├── activeNav === "Home"       → renders <ManagerHome> or project/stage cards
├── activeNav === "Projects"   → renders project grid inline
├── activeNav === "Templates"  → renders <Templates />
├── activeNav === "Experts"    → renders <Experts />
├── activeNav === "Sessions"   → renders <Sessions />
└── selectedProject !== null   → renders <ProjectDetail />
```

All views were rendered inside one component. No URL changes. No browser back/forward support.

### New Routing (Next.js App Router — file-based)

```
/                  → app/page.js         (Home)
/login             → app/login/page.js   (Login)
/projects          → app/projects/page.js (All Projects)
/projects/:id      → app/projects/[id]/page.js (Project Detail)
/templates         → app/templates/page.js
/templates?stage=X → app/templates/page.js (pre-filtered)
/experts           → app/experts/page.js
/sessions          → app/sessions/page.js
```

Benefits:
- Each page has its own URL (shareable, bookmarkable)
- Browser back/forward buttons work
- Each page loads independently
- Better code splitting

---

## 15. What Was Removed

| Item | Reason |
|------|--------|
| `figma:asset/...` image imports | Not compatible with Next.js; replaced with URL strings |
| `vite.config.js` | Vite build tool replaced by Next.js |
| `src/supabase/*` files | Supabase was unused in the React app |
| `src/utils/supabase/*` | Not needed (contained exposed keys) |
| `src/imports/Slide*.jsx`, `Frame2095585241*.jsx`, `Modal.jsx` | Unused Figma export artifacts |
| `src/components/TemplateDetailModal.jsx` | Was never imported anywhere |
| `src/styles/globals.css` | Replaced by `app/globals.css` with Tailwind v4 |
| `src/index.css` (2683 lines of compiled Tailwind) | Replaced by proper Tailwind build pipeline |
| `@jsr/supabase__supabase-js`, `hono`, `axois` dependencies | Not needed in Next.js version |
| `axios` dependency | Was unused (api.js used `fetch`) |
| Mock data fallbacks in `api.js` | Backend is now built-in; mocks not needed |
| Invalid `getMockDocuments:` syntax in old `api.js` | Bug fixed by rewriting the service |

---

## 16. What Was Added

| Item | Purpose |
|------|---------|
| `lib/db.js` | Azure SQL connection pool using `mssql` |
| 7 API route files | Complete backend for all data operations |
| `app/template.js` | AppShell wrapper for all pages |
| `app/projects/[id]/page.js` | Dynamic route for project detail |
| `components/Sidebar.jsx` | Extracted from 1444-line App.jsx |
| `components/Header.jsx` | Extracted from 1444-line App.jsx |
| `components/AppShell.jsx` | Auth + layout wrapper (replaces App.jsx logic) |
| `postcss.config.mjs` | Tailwind CSS build configuration |
| `next.config.mjs` | Next.js configuration (image domains) |
| `jsconfig.json` | Path alias support (`@/` → project root) |
| `.env.example` | Environment variable template |
| Proper Tailwind v4 build pipeline | Replaces pre-compiled CSS file |

---

## 17. How to Run

### Development
```bash
cd neurox-nextjs
npm run dev
```
Opens at `http://localhost:3000`

### Production Build
```bash
npm run build
npm run start
```

### User Flow
1. Visit `http://localhost:3000` — redirected to `/login`
2. Select "Designer" or "Manager" role → click "Continue"
3. **Designer** sees: Recent Projects, Design Thinking Stages, Feature Cards
4. **Manager** sees: Stats, Clients, Expert Sessions
5. Navigate via sidebar: Projects, Templates, Experts, Sessions
6. Click a project → see detail with document stages
7. Click avatar → View Profile → Edit Profile
8. Click "Create New Project" → fill form → project saved to database

---

## 18. How to Test API Routes

You can test API routes directly in the browser or with tools like Postman/curl.

### Examples (with curl)

**Get all users:**
```bash
curl http://localhost:3000/api/users
```

**Get a specific user:**
```bash
curl http://localhost:3000/api/users?userId=u
```

**Create a project:**
```bash
curl -X POST "http://localhost:3000/api/projects?userId=u" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"p1","projectName":"Test Project","projectDescription":"A test","status":"In Progress","client":"Acme"}'
```

**Get all templates for a stage:**
```bash
curl http://localhost:3000/api/templates?stageId=empathize
```

**Get template summary:**
```bash
curl http://localhost:3000/api/templates?summary=true
```

**Create a booking:**
```bash
curl -X POST "http://localhost:3000/api/bookings?userId=u" \
  -H "Content-Type: application/json" \
  -d '{"expertId":"e1","bookingDateTime":"2025-01-15T10:00:00Z","description":"UX Review"}'
```

**Get all experts:**
```bash
curl http://localhost:3000/api/experts
```

**Get all stages:**
```bash
curl http://localhost:3000/api/stages
```

**Delete a project:**
```bash
curl -X DELETE "http://localhost:3000/api/projects?projectId=p1"
```

---

## End of Documentation

This document covers the complete conversion from React Vite to Next.js full-stack. All original UI functionality has been preserved while adding a proper backend with Azure SQL Database integration.
