# Lomir — Frontend

React single-page application for **Lomir**, a team-matching platform that helps people find collaborators based on shared interests, skills, badges, and location.

Built with React 19, Vite, Tailwind CSS, and DaisyUI.

---

## Features

- **Search & Discovery** — Find teams, users, and vacant roles by keyword, tags, badges, or location with list and map views
- **Best Match Sorting** — Weighted matching algorithm scores teams and roles against your profile
- **Team Management** — Create teams, manage members, post vacant roles, handle applications and invitations
- **User Profiles** — Customizable profiles with interest tags, badges, avatar uploads, and location
- **Real-Time Chat** — Direct and team group messaging with typing indicators and read receipts (Socket.IO)
- **Badge System** — Browse 30 badges across 5 color-coded categories; award badges to teammates
- **Interactive Map** — Toggle between list and map views with React Leaflet; distance-based filtering
- **Notifications** — In-app notification center for invitations, applications, and badge awards
- **Boolean Search** — Advanced search input with pill-based tag/badge/criteria filters

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 + DaisyUI 5 |
| Routing | React Router 7 |
| HTTP Client | Axios |
| Real-time | Socket.IO Client |
| Maps | Leaflet + React Leaflet |
| Icons | Lucide React, React Icons |
| Date Utilities | date-fns |

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- The [Lomir backend](https://github.com/KasparSinitsin/Lomir-backend) running on `http://localhost:5001`

### 1. Clone and switch to `dev`

```bash
git clone https://github.com/KasparSinitsin/Lomir-frontend.git
cd Lomir-frontend
git checkout dev
git pull origin dev
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

Create a `.env` file in the project root:

```env
# API connection
VITE_API_URL=http://localhost:5001

# Optional Socket.IO override
VITE_SOCKET_URL=http://localhost:5001

# Cloudinary (frontend presets for direct uploads)
VITE_CLOUDINARY_CLOUD_NAME=<cloud-name>
VITE_CLOUDINARY_UPLOAD_PRESET=<upload-preset>
VITE_CLOUDINARY_PRESET_AVATARS=<preset-avatars>
VITE_CLOUDINARY_PRESET_TEAM_AVATARS=<preset-team-avatars>
VITE_CLOUDINARY_PRESET_CHAT_IMAGES=<preset-chat-images>
VITE_CLOUDINARY_PRESET_CHAT_FILES=<preset-chat-files>
```

> Get the Cloudinary values from the project owner.

### 4. Verify the API base URL

Open `src/services/api.js` and make sure it points to localhost:

```js
const API_URL = "http://localhost:5001";
```

### 5. Start the dev server

```bash
npm run dev
```

The app starts on `http://localhost:5173` with hot module replacement.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```text
Lomir-frontend/
├── public/
├── src/
│   ├── main.jsx                    # App entry point
│   ├── App.jsx                     # Root component with routing
│   ├── index.css                   # Global styles + Tailwind imports
│   ├── pages/
│   │   ├── Home.jsx                # Public landing page
│   │   ├── SearchPage.jsx          # Search with list/map view toggle
│   │   ├── MyTeams.jsx             # User's teams, invitations, applications
│   │   ├── Profile.jsx             # User profile editing
│   │   ├── Register.jsx            # Multi-step registration
│   │   ├── Login.jsx
│   │   ├── Chat.jsx                # Direct + team messaging
│   │   ├── BadgeOverview.jsx       # Badge catalog and details
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── VerifyEmail.jsx
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── auth/                   # Login/register forms
│   │   ├── teams/                  # Team cards, modals, vacant roles, applications
│   │   ├── users/                  # User cards and detail modals
│   │   ├── badges/                 # Badge display, awarding, category modals
│   │   ├── tags/                   # Tag input, display, and selection
│   │   ├── chat/                   # Chat UI components
│   │   ├── common/                 # Shared UI (Button, Card, Modal, Alert, Pagination...)
│   │   └── layout/                 # Navbar, Footer, PageContainer, Grid, Section
│   ├── contexts/
│   │   ├── AuthContext.jsx         # Authentication state + JWT management
│   │   ├── UserModalContext.jsx    # Global user detail modal
│   │   ├── TeamModalContext.jsx    # Global team detail modal state
│   │   └── ModalLayerContext.jsx   # Modal stacking support
│   ├── services/
│   │   ├── api.js                  # Axios instance with interceptors
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── teamService.js
│   │   ├── searchService.js
│   │   ├── matchingService.js
│   │   ├── vacantRoleService.js
│   │   ├── badgeService.js
│   │   ├── tagService.js
│   │   ├── messageService.js
│   │   ├── notificationService.js
│   │   ├── socketService.js        # Socket.IO client wrapper
│   │   └── geocodingService.js
│   ├── hooks/                      # Custom hooks (useViewerMatchProfile, useAwardModals...)
│   ├── utils/                      # Helper functions (teamMatchUtils, locationUtils...)
│   ├── constants/                  # Badge constants, UI text, pagination config
│   ├── config/
│   │   └── cloudinary.js           # Cloudinary upload helper
│   └── assets/                     # Logos, gradients, and icon assets
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── .env                            # Environment variables (not committed)
├── package.json
└── README.md
```

---

## Key Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing Page | Public homepage |
| `/search` | Search | Find teams, users, and roles — list or map view |
| `/teams/my-teams` | My Teams | Teams you belong to, pending invitations and applications |
| `/profile` | Profile | Edit your profile, tags, avatar, and location |
| `/chat` | Chat | Direct messages and team group chat |
| `/badges` | Badges | Browse all badges and their categories |

---

## Troubleshooting

- **CORS errors** — Make sure the backend is running on port 5001 and the frontend on 5173
- **Socket.IO won't connect** — Verify `VITE_SOCKET_URL` in `.env` if you set it; otherwise the client falls back to `http://localhost:5001`
- **"Access denied. No token provided."** — You need to be logged in; check that `localStorage` has a valid token
- **Port already in use** — `lsof -i :5173` to find the process, `kill -9 <PID>` to free it

---

## Related

- **Backend repo:** [Lomir-backend](https://github.com/KasparSinitsin/Lomir-backend)

