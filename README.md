<div align="center">
  <img src="https://shortify.cc.cd/logo.png" alt="Shortify Logo" width="150" />

  # Shortify - The Ultimate Short Video & Learning Platform

  **A modern, responsive, and blazing-fast web application for watching short videos (reels), learning skills, and managing user profiles. Build your community, learn new things, and stay entertained!**

  <p>
    <a href="https://shortify.cc.cd"><img src="https://img.shields.io/badge/Live-Website-success?style=for-the-badge&logo=vercel" alt="Live Website"></a>
    <a href="https://www.npmjs.com/package/@satyamrojha/shortify"><img src="https://img.shields.io/npm/v/@satyamrojha/shortify?style=for-the-badge&logo=npm" alt="NPM Version"></a>
    <a href="https://github.com/satyamrojhax/shortify"><img src="https://img.shields.io/github/stars/satyamrojhax/shortify?style=for-the-badge&logo=github" alt="GitHub Stars"></a>
    <a href="https://github.com/satyamrojhax/shortify/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License"></a>
  </p>

  [Live Demo](https://shortify.cc.cd) • [NPM Package](https://www.npmjs.com/package/@satyamrojha/shortify) • [Report Bug](https://github.com/satyamrojhax/shortify/issues) • [Request Feature](https://github.com/satyamrojhax/shortify/issues)
</div>

---

## 📖 Table of Contents

1. [About The Project](#-about-the-project)
2. [Key Features Breakdown](#-key-features-breakdown)
    - [📱 Reels & Video Player](#-reels--video-player)
    - [🧠 Learning & Skills (Courses)](#-learning--skills-courses)
    - [👤 User Profiles & Community](#-user-profiles--community)
    - [🛠️ Admin & Management](#️-admin--management)
    - [⚡ Progressive Web App (PWA)](#-progressive-web-app-pwa)
3. [Tech Stack & Architecture](#-tech-stack--architecture)
4. [Folder Structure](#-folder-structure)
5. [Getting Started (Local Development)](#-getting-started-local-development)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
6. [Environment Variables Setup](#-environment-variables-setup)
7. [Database Setup (Supabase)](#-database-setup-supabase)
8. [Deployment Guide](#-deployment-guide)
    - [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
    - [Mobile Apps (Capacitor)](#mobile-apps-capacitor)
9. [NPM Package Usage](#-npm-package-usage)
10. [Contributing](#-contributing)
11. [FAQ](#-faq)
12. [License](#-license)
13. [Contact & Credits](#-contact--credits)

---

## 🚀 About The Project

**Shortify** is not just another video sharing platform. It is a dual-purpose ecosystem designed for both **entertainment** and **education**. We recognized that users spend hours scrolling through short videos (reels), and we decided to harness that engagement by integrating a fully-fledged Learning Management System (LMS) directly into the app.

Users can seamlessly transition from watching funny or entertaining short clips to taking structured courses on programming, language learning (English courses), and various other skills. Everything is wrapped in a beautiful, mobile-first, highly responsive UI powered by React 19, Tailwind CSS v4, and Radix UI.

Whether you want to build the next TikTok clone, an educational platform, or a hybrid of both, **Shortify** provides the ultimate open-source boilerplate to get you started in minutes.

---

## 🌟 Key Features Breakdown

### 📱 Reels & Video Player
- **Infinite Scroll Engine:** A highly optimized infinite scrolling feed that mimics the mechanics of Instagram Reels and TikTok.
- **HLS Adaptive Streaming:** Uses `hls.js` and `vidstack` for buffer-free streaming that dynamically adapts to the user's internet speed.
- **Interactions:** Double-tap to like, bookmark videos to watch later, and favorite creators.
- **Offline Mode:** The built-in offline downloader caches videos directly into the browser's IndexedDB, allowing users to watch downloaded reels even when they have no internet connection or are on airplane mode.
- **Video Pre-warmer:** Intelligently pre-loads the next few videos in the background to ensure zero latency when scrolling.

### 🧠 Learning & Skills (Courses)
- **Dedicated Skills Section:** A completely separate tab for educational content.
- **Structured Courses:** Courses are divided into chapters and modules.
- **Interactive Player:** A robust course player that keeps track of where the user left off.
- **English Learning Modules:** Specialized UI for language learning.
- **Progress Tracking:** Users can view their enrolled courses and track completion percentages natively in their dashboard.

### 👤 User Profiles & Community
- **Creator Pages:** Every user gets a public profile showcasing their uploaded videos and courses.
- **Personal Dashboard:** A private area to manage history, favorites, saved videos, and downloaded content.
- **Gamification & Streaks:** The app tracks daily logins and rewards users with "Streaks." 
- **Virtual Shop & Redemptions:** Users can spend their earned streak points or virtual currency in the Shop to redeem real-world or digital rewards.
- **Global Leaderboard:** Compete with other users globally to have the highest watch time and longest streaks.

### 🛠️ Admin & Management
- **Secure Admin Panel:** A restricted route (`/admin`) accessible only to authorized administrators.
- **User Management:** View all registered users, ban accounts, or elevate privileges.
- **Redemption Requests:** Approve or deny rewards requested by users from the Shop.
- **System Settings:** Configure global app parameters dynamically.

### ⚡ Progressive Web App (PWA)
- **Installable:** Prompt users to "Add to Home Screen" for a native app-like experience on iOS and Android without going through the App Store.
- **Service Workers:** Advanced caching strategies using Workbox to ensure lightning-fast load times.
- **Capacitor Ready:** Easily compile the web app into a real native Android APK or iOS IPA using Ionic Capacitor.

---

## 💻 Tech Stack & Architecture

Shortify is built on the bleeding edge of modern web development:

- **Frontend Framework:** React 19 (The latest and greatest)
- **Build Tool:** Vite 8 (Incredibly fast HMR and builds)
- **Routing:** TanStack Router (Type-safe routing)
- **Styling:** Tailwind CSS v4 + PostCSS
- **UI Components:** shadcn/ui + Radix UI Primitives
- **Animations:** Framer Motion & tw-animate-css
- **Video Player:** Vidstack + hls.js
- **State Management & Data Fetching:** TanStack React Query
- **Backend & Database:** Supabase (PostgreSQL) + Appwrite / Firebase (Optional integrations)
- **Form Handling:** React Hook Form + Zod
- **Icons:** Lucide React

---

## 📁 Folder Structure

```text
shortify/
├── api/                   # Serverless edge functions
├── public/                # Static assets (images, icons, manifest.json)
├── scripts/               # Utility scripts for database initialization
├── src/
│   ├── components/        # Reusable React components
│   │   ├── ui/            # shadcn/ui base components
│   │   └── ...            # App-specific components (players, modals)
│   ├── hooks/             # Custom React hooks (useAuth, useOffline, etc.)
│   ├── lib/               # Utility functions, database clients (supabase.ts)
│   ├── routes/            # TanStack Router page routes
│   ├── styles.css         # Global Tailwind v4 styles
│   ├── main.tsx           # Application entry point
│   └── router.tsx         # Route configuration
├── .env.example           # Environment variables template
├── capacitor.config.ts    # Capacitor mobile build config
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite bundler configuration
└── README.md              # You are here
```

---

## 🚀 Getting Started (Local Development)

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have met the following requirements:
* **Node.js**: v18.x or higher (v20+ recommended)
* **npm** (v9+), **yarn**, or **bun**
* A free [Supabase](https://supabase.com/) account
* Git installed on your system

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/satyamrojhax/shortify.git
   cd shortify
   ```

2. **Install dependencies:**
   Using npm:
   ```bash
   npm install
   ```
   *Or using yarn:*
   ```bash
   yarn install
   ```

3. **Set up Environment Variables:**
   Copy the example `.env` file to create your own configuration.
   ```bash
   cp .env.example .env
   ```
   *(See the [Environment Variables Setup](#-environment-variables-setup) section below for detailed instructions on what to put inside this file).*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Open your browser and navigate to `http://localhost:5173`. The app should now be running locally!

---

## 🔑 Environment Variables Setup

Shortify relies on external services (primarily Supabase) to function. You must configure your `.env` file correctly. 

Here is what your `.env` file should look like:

```env
# ---------------------------------------------------------
# SUPABASE CONFIGURATION (Required)
# ---------------------------------------------------------
# 1. Create a project at https://supabase.com/
# 2. Go to Project Settings -> API
# 3. Copy the URL and the anon public key

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key

# This is highly sensitive! Found under Project Settings -> API -> service_role secret
SUPABASE_SECRET_KEY=your-service-role-key

# ---------------------------------------------------------
# AUTHENTICATION
# ---------------------------------------------------------
# Used for JWT validation. Replace 'your-project-id' with your actual Supabase project ID.
SUPABASE_JWKS_URL=https://your-project-id.supabase.co/auth/v1/.well-known/jwks.json

# ---------------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------------
# Found under Project Settings -> Database -> Connection string -> URI
# Ensure you replace [YOUR-PASSWORD] with your actual database password!
DATABASE_URL=postgresql://postgres.your-project-id:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

---

## 🗄️ Database Setup (Supabase)

To get the app fully working, your Supabase PostgreSQL database needs the correct tables and schemas. 

We have provided initialization scripts to help you set up the database structure automatically.

1. Ensure your `.env` file has the correct `DATABASE_URL` configured.
2. Run the initialization script provided in the `scripts` folder:
   ```bash
   node scripts/init_db.js
   ```
3. This script will connect to your Supabase instance and create the necessary tables:
   - `users`: Stores user profiles, avatars, and streak data.
   - `reels`: Stores the short video metadata, URLs, and view counts.
   - `courses`: Stores the educational content modules.
   - `history`: Tracks what users have watched.
   - `likes` / `favorites`: Relational tables for interactions.

Alternatively, you can manually execute the SQL schema in your Supabase SQL Editor (check the `scripts` folder for raw SQL files if available).

---

## ☁️ Deployment Guide

Shortify is optimized for modern serverless hosting platforms. We highly recommend deploying to **Vercel** for the easiest, zero-config experience.

### Vercel Deployment (Recommended)

1. **Push your code to GitHub:**
   Ensure all your latest changes and commits are pushed to a repository on your GitHub account.

2. **Log into Vercel:**
   Navigate to [Vercel.com](https://vercel.com/) and sign in using your GitHub account.

3. **Import Project:**
   - Click the **"Add New..."** button and select **"Project"**.
   - Search for your `shortify` repository and click **"Import"**.

4. **Configure Environment Variables:**
   - Before clicking deploy, expand the **"Environment Variables"** section.
   - You MUST add every variable from your local `.env` file into Vercel. 
   - Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `DATABASE_URL`.

5. **Deploy:**
   - Vercel will automatically detect that this is a Vite project.
   - It will set the build command to `npm run build` and the output directory to `dist`.
   - Click **Deploy**. Within 2-3 minutes, your site will be live globally on a Vercel URL!

### Mobile Apps (Capacitor)

If you want to turn Shortify into a native Android or iOS app:

1. Build the web project first:
   ```bash
   npm run cap:build
   ```
2. Generate App Icons (requires `@capacitor/assets`):
   ```bash
   npm run cap:icons
   ```
3. Open in Android Studio or Xcode:
   ```bash
   npx cap open android
   # or
   npx cap open ios
   ```
4. Build and deploy directly to your physical device or emulator.

---

## 📦 NPM Package Usage

While Shortify is primarily an application template, we have also published it to the NPM registry. This makes it easier for developers to download the source code globally.

To download the project via NPM into an empty directory, simply run:

```bash
npm install @satyamrojha/shortify
```

You can find the official package page here:  
**[npmjs.com/package/@satyamrojha/shortify](https://www.npmjs.com/package/@satyamrojha/shortify)**

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our full **[Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)** to learn how to:
1. Fork the Project and create a feature branch.
2. Setup the project locally.
3. Submit a Pull Request.

---

## 🔒 Security

We take the security of our users very seriously. If you have discovered a vulnerability, **do not open a public issue.** 

Please refer to our **[Security Policy (SECURITY.md)](SECURITY.md)** for instructions on how to privately disclose vulnerabilities to our team.

---

## ❓ FAQ

**Q: Is this completely free to use?**  
A: Yes! Shortify is MIT licensed. You can use it for personal or commercial projects.

**Q: Do I have to use Supabase?**  
A: By default, the app is deeply integrated with Supabase for Auth and Database. However, the architecture is modular enough that you could swap out the `src/lib/supabase.ts` calls with Firebase or Appwrite if you prefer.

**Q: How do the video downloads work offline?**  
A: We use IndexedDB (via localforage) combined with Service Workers. When a user clicks "Download", the HLS chunks or MP4 files are cached directly into the browser's persistent storage.

**Q: Why is my live deployment showing a blank screen?**  
A: Ensure that you have added your Supabase environment variables in Vercel. If `VITE_SUPABASE_URL` is missing, the app will fail to boot. Check your browser console for exact errors.

---

## 📄 License

Distributed under the **MIT License**. See the **[LICENSE](LICENSE)** file for more information.

---

## 📬 Contact & Credits

**Satyam Rojha** (LFRDCA Technologies)
- Website: [https://shortify.cc.cd](https://shortify.cc.cd)
- Email: lfrdcatechnologies@outlook.com
- GitHub: [@satyamrojhax](https://github.com/satyamrojhax)
- NPM: [@satyamrojha/shortify](https://www.npmjs.com/package/@satyamrojha/shortify)

If you find this project useful, please consider giving it a ⭐ on GitHub! It helps a lot!
