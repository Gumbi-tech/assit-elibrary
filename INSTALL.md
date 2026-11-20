# eLibrary Demo — Installation Guide (Manual, No Docker)

This guide walks you through installing and running the **eLibrary Demo** project on a new computer without using Docker.

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Environment Variables](#3-environment-variables)
4. [Install Node.js Dependencies](#4-install-nodejs-dependencies)
5. [Set Up PostgreSQL Database](#5-set-up-postgresql-database)
6. [Initialize Prisma ORM](#6-initialize-prisma-orm)
7. [Seed Sample Data (Optional)](#7-seed-sample-data-optional)
8. [Run the Project](#8-run-the-project)
9. [Build for Production](#9-build-for-production)
10. [Default Demo Credentials](#10-default-demo-credentials)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Install the following on the target machine before proceeding:

| Software | Minimum Version | Download |
|----------|----------------|----------|
| **Node.js** | 20.x LTS | https://nodejs.org/ |
| **npm** | Comes with Node.js | Bundled with Node.js |
| **PostgreSQL** | 16.x | https://www.postgresql.org/download/ |

Verify installations:

```bash
node --version      # Should show v20.x.x or higher
npm --version       # Should show 10.x.x or higher
psql --version      # Should show PostgreSQL 16.x
```

---

## 2. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Gumbi-tech/assit-elibrary.git
cd elibrary-demo
```

> If you already have the project folder copied, skip this step and `cd` into the project directory.

---

## 3. Environment Variables

The project requires a `.env` file in the root directory. This file is **not** tracked by git (it is in `.gitignore`), so you must create it manually.

Create a file named `.env` in the project root:

```env
# Database connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elibrary?schema=public"

# Authentication secrets
JWT_SECRET="your-random-jwt-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# File storage
STORAGE_DRIVER="local"
STORAGE_SIGNING_SECRET="your-storage-signing-secret-here"
```

### Notes
- Replace `your-random-jwt-secret-here`, `your-nextauth-secret-here`, and `your-storage-signing-secret-here` with strong random strings.
- If your PostgreSQL uses a different username/password/database, update `DATABASE_URL` accordingly.

---

## 4. Install Node.js Dependencies

Run the following in the project root:

```bash
npm install
```

This installs all production and development dependencies listed in `package.json`, including:

- **Framework:** Next.js 15.1.3, React 19
- **ORM:** Prisma 6.2.1 (@prisma/client)
- **Auth:** jose, bcryptjs
- **Validation:** zod
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **Utilities:** date-fns, uuid, xlsx, lucide-react

---

## 5. Set Up PostgreSQL Database

### Step 5.1: Start PostgreSQL

Make sure the PostgreSQL service is running:

- **Windows:** Start the "PostgreSQL" service via Services.msc, or run:
  ```powershell
  net start postgresql-x64-16
  ```

- **macOS (Homebrew):**
  ```bash
  brew services start postgresql@16
  ```

- **Linux:**
  ```bash
  sudo systemctl start postgresql
  ```

### Step 5.2: Create the Database

Connect to PostgreSQL and create a database named `elibrary`:

```bash
psql -U postgres
```

Then in the `psql` prompt:

```sql
CREATE DATABASE elibrary;
\q
```

> If you set a custom password during PostgreSQL installation, use `psql -U postgres -W` and enter your password.

---

## 6. Initialize Prisma ORM

The project uses Prisma to manage the database schema. Run these commands in order:

### 6.1 Generate Prisma Client

```bash
npx prisma generate
```

This generates the TypeScript types and client code based on `prisma/schema.prisma`.

### 6.2 Push Schema to Database

```bash
npx prisma db push
```

This creates all tables in the `elibrary` database:
- `Department`
- `Course`
- `Document`
- `User`

It also creates indexes and enums (`Role`, `AccountStatus`).

> `prisma db push` is used instead of migrations in this project. For production deployments, consider using `prisma migrate deploy`.

---

## 7. Seed Sample Data (Optional)

To populate the database with sample departments, courses, and demo users:

```bash
npm run seed
```

This creates:
- 3 Departments (Software Engineering, Cyber Security, Multi Media)
- 9 Courses
- Sample document records
- Empty placeholder PDF files in `public/uploads/`

---

## 8. Run the Project

### Development Mode

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:3000
```

### Production Build & Start

To build and run in production mode:

```bash
npm run build
npm start
```

Then visit `http://localhost:3000`.

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start development server with hot reload |
| `build` | `next build` | Build for production |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `db:push` | `prisma db push` | Push Prisma schema to database |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `seed` | `ts-node prisma/seed.ts` | Seed database with sample data |

---

## 9. Build for Production

If you need to deploy the built application:

```bash
npm run build
```

Output is generated in the `.next/` folder. Then run:

```bash
npm start
```

The app will listen on port `3000` by default (set `PORT` environment variable to change it).

---

## 10. Default Demo Credentials

After seeding (or using the default in-memory users), you can log in with:

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@college.ac.sz | password123 |
| Instructor | se.instructor@college.ac.sz | password123 |
| Student | student.se@college.ac.sz | password123 |

> These users are defined in `src/context/AuthContext.tsx` and are stored in `localStorage` on the client side.

---

## 11. Troubleshooting

### Problem: `prisma db push` fails with connection error
**Cause:** PostgreSQL is not running, or `DATABASE_URL` is incorrect.
**Fix:**
1. Verify PostgreSQL service is running.
2. Test the connection manually: `psql "postgresql://postgres:postgres@localhost:5432/elibrary"`
3. Check that `.env` has the correct `DATABASE_URL`.

### Problem: `npm install` fails or hangs
**Cause:** Network issues or corrupted cache.
**Fix:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Problem: Next.js build errors
**Fix:** Ensure all environment variables are set before running `npm run build`. The project uses `next.config.js` for Next.js configuration.

### Problem: Port 3000 already in use
**Fix:** Change the port:
```bash
set PORT=3001 && npm run dev      # Windows PowerShell
PORT=3001 npm run dev             # macOS/Linux
```

---

## Summary Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 16+ installed and running
- [ ] Repository cloned
- [ ] `.env` file created with `DATABASE_URL` and secrets
- [ ] Database `elibrary` created in PostgreSQL
- [ ] `npm install` completed
- [ ] `npx prisma generate` completed
- [ ] `npx prisma db push` completed
- [ ] `npm run seed` (optional)
- [ ] `npm run dev` — app running at `http://localhost:3000`

---

*End of Installation Guide*