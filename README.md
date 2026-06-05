# Lomir — Frontend

React single-page application for **Lomir**, a team-matching platform that helps people find collaborators based on shared interests, skills, badges, and location.

Built with React 19, Vite, Tailwind CSS, and DaisyUI.

---

## Live Demo

**Try it now:** [lomir-frontend.vercel.app](https://lomir-frontend.vercel.app)

> The backend runs on Render's free tier and enters sleep mode after inactivity. The first request may take 15–30 seconds to wake up — after that, everything responds normally.

| Service  | Platform | URL |
|----------|----------|-----|
| Frontend | Vercel   | [lomir-frontend.vercel.app](https://lomir-frontend.vercel.app) |
| Backend  | Render   | [lomir-backend-knae.onrender.com](https://lomir-backend-knae.onrender.com) |
| Database | Neon     | PostgreSQL (remote) |

### Test Credentials

Contact the project owner for a demo login, or register a new account with a valid email address (email verification is required).

---

## Features

- **Search & Discovery** — Find teams, users, and vacant roles by keyword, tags, badges, or location; use Boolean search helpers, responsive filter/sort controls, and shared card/mini/list/map view toggles
- **Best Match Sorting** — Weighted matching algorithm scores teams and roles against your profile (tags 40%, badges 30%, distance 30%)
- **Map View** — Leaflet-powered map with custom markers for teams, users, and roles; popups with detail cards; distance-based filtering and proximity sorting
- **Team Management** — Create teams, manage members and roles, post vacant roles, handle applications and invitations with role-specific targeting; My Teams uses the same responsive sort and result-view controls as search
- **User Profiles** — Customizable profiles with interest tags, badges, avatar uploads (ImageKit), and geocoded location
- **Real-Time Chat** — Direct and team group messaging with typing indicators, read receipts, file/image sharing, @mentions, reply threading, and rich system event messages (Socket.IO)
- **Badge System** — Browse 30 badges across 5 color-coded categories; award badges to teammates with reasons and team context
- **Notifications** — In-app notification center for invitations, applications, badge awards, and role updates
- **Account Deletion** — Multi-step account deletion with impact preview, automatic team ownership transfer, and graceful "Former Lomir User" handling across chat, badges, and notifications
- **Demo Data Indicators** — Synthetic/seed data is visually labeled with FlaskConical icons and "DEMO" avatar overlays so users can distinguish test content from real data
- **Security** — Cloudflare Turnstile CAPTCHA on registration (feature-flagged), enforced password policy (min 8 chars, letter + number)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 + DaisyUI 5 |
| Routing | React Router 7 |
| HTTP Client | Axios |
| Server State | TanStack React Query 5 |
| Real-time | Socket.IO Client |
| Maps | Leaflet + React Leaflet |
| Icons | Lucide React, React Icons |
| Date Utilities | date-fns |
| Autocomplete | Downshift |
| Image Uploads | ImageKit (client-side upload with server-authenticated tokens) |
| CAPTCHA | Cloudflare Turnstile (feature-flagged) |

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- The [Lomir backend](https://github.com/KasparSinitsin/Lomir-backend) running on `http://localhost:5001`

### 1. Clone the repo

```bash
git clone https://github.com/KasparSinitsin/Lomir-frontend.git
cd Lomir-frontend
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

# Optional Socket.IO override (defaults to VITE_API_URL if unset)
# VITE_SOCKET_URL=http://localhost:5001

# ImageKit (image/file uploads — get values from the project owner)
VITE_IMAGEKIT_PUBLIC_KEY=<your-public-key>
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>

# Cloudflare Turnstile (optional for local dev — if unset, CAPTCHA is not shown)
# VITE_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

> Get the ImageKit values from the project owner.

### 4. Start the dev server

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
│   │   ├── SearchPage.jsx          # Search with list/map toggle, advanced filtering
│   │   ├── searchPageHelpers.js    # Helper functions for SearchPage (not a page itself)
│   │   ├── MyTeams.jsx             # User's teams, invitations, applications
│   │   ├── Profile.jsx             # User profile editing
│   │   ├── PublicProfile.jsx       # Profile placeholder for deleted/missing users
│   │   ├── Register.jsx            # Multi-step registration with CAPTCHA
│   │   ├── Login.jsx
│   │   ├── Chat.jsx                # Direct + team messaging with file sharing
│   │   ├── BadgeOverview.jsx       # Badge catalog and details
│   │   ├── Settings.jsx            # Password change + account deletion modal
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── VerifyEmail.jsx
│   │   └── DesignSystem.jsx        # Dev-only component playground
│   ├── components/
│   │   ├── BooleanSearchInput.jsx  # Textarea-based Boolean search input with operator helpers
│   │   ├── SearchHelp.jsx          # Search Tips popup panel
│   │   ├── auth/                   # Login/register forms, TurnstileWidget
│   │   ├── teams/                  # Team cards, detail modals, vacant roles,
│   │   │                           #   applications, invitations, member management
│   │   ├── users/                  # User cards, detail modals, InlineUserLink,
│   │   │                           #   UserAvatar, DemoAvatarOverlay, deleted user handling
│   │   ├── badges/                 # Badge display, awarding, category modals, AwardCard
│   │   ├── tags/                   # Tag input, display, and selection
│   │   ├── chat/                   # Chat UI, message bubbles, file/image previews,
│   │   │                           #   MentionDropdown, MessageText (mentions + URLs),
│   │   │                           #   reply previews, system event messages
│   │   ├── search/                 # SearchMapView (Leaflet map with markers/popups)
│   │   ├── common/                 # Shared UI: Button, Card, Modal, Alert, Pagination,
│   │   │                           #   ImageUploader, LocationInput, TurnstileWidget,
│   │   │                           #   FilterSortOptionButton, ResultViewToggle,
│   │   │                           #   PersonRequestCard, RequestListModal, Tooltip...
│   │   └── layout/                 # Navbar, Footer, PageContainer, Grid, Section
│   ├── contexts/
│   │   ├── AuthContext.jsx         # Authentication state + JWT management
│   │   ├── UserModalContext.jsx    # Global user detail modal stack
│   │   ├── TeamModalContext.jsx    # Global team detail modal state
│   │   ├── ToastContext.jsx        # Toast notification state + dispatch
│   │   └── ModalLayerContext.jsx   # Modal z-index stacking
│   ├── lib/
│   │   └── queryClient.js          # TanStack React Query client configuration
│   ├── services/
│   │   ├── api.js                  # Axios instance with default camelCase ↔ snake_case interceptors;
│   │   │                           #   call sites can opt out via skipRequestCaseTransform /
│   │   │                           #   skipResponseCaseTransform for explicit per-call data contracts
│   │   ├── userService.js          # Includes deletionPreview + deleteUser
│   │   ├── teamService.js
│   │   ├── searchService.js
│   │   ├── matchingService.js
│   │   ├── vacantRoleService.js
│   │   ├── teamMemberRoleReopenService.js # Role reopen requests by team members
│   │   ├── badgeService.js
│   │   ├── tagService.js
│   │   ├── messageService.js
│   │   ├── notificationService.js
│   │   ├── socketService.js        # Socket.IO client wrapper
│   │   └── geocodingService.js
│   ├── hooks/
│   │   ├── useUserQueries.js       # React Query hooks for user profile/tags/badges (useUserProfile, useUserTags, useUserBadges) + unwrap helpers
│   │   ├── useTagQueries.js        # React Query hooks for structured tags
│   │   ├── useBadgeQueries.js      # React Query hooks for badge catalog and shared-teams lookups
│   │   ├── useViewerMatchProfile.js # Viewer's tags/badges/location for client-side scoring
│   │   ├── useViewerPendingRequests.js # Shared cache of viewer's pending invitations + applications, consumed by MyTeams and modals
│   │   ├── useViewerTeamMemberships.js # Viewer's team memberships for "already in team" gates
│   │   ├── useTeamRequestLists.js  # Shared list state for TeamApplicationsModal / TeamInvitesModal
│   │   ├── usePolledRequestRoles.js # Bulk-poll vacant role status every 20s via /vacant-roles?ids=
│   │   ├── useSelfRoleMatchMap.js  # Viewer's match scores against a set of roles
│   │   ├── useHydratedRole.js      # Fetch full role details + match score for modals; polls role status every 20 s
│   │   ├── useLocationAutoFill.js  # Geocoding-based city/country auto-fill from postal code
│   │   ├── useLocation.js          # Reverse-geocode current device location
│   │   ├── useMyTeamsSort.js       # Sort state for MyTeams page
│   │   ├── useClientPagination.js  # Client-side pagination state for lists
│   │   ├── useSocketEvents.js      # Subscribe to a set of Socket.IO events with React-safe cleanup
│   │   ├── useAwardModals.js       # Badge award modal state management
│   │   └── useTheme.js             # Theme toggle state
│   ├── utils/
│   │   ├── formatters.js           # camelCase ↔ snake_case conversion (used by api.js interceptors)
│   │   ├── deletedUser.js          # "Former Lomir User" display utilities + FormerUserAvatar
│   │   ├── userHelpers.js          # Initials, display names, isSynthetic* helpers, demo tooltips
│   │   ├── nameFormatters.js       # Middle-name abbreviation and display name formatting
│   │   ├── teamMatchUtils.js       # Team/role match scoring + overlap calculations
│   │   ├── matchHelpers.js         # Shared match score helpers (weights, render cascade)
│   │   ├── matchScoreUtils.js      # Match tier color coding (green/yellow/orange)
│   │   ├── payloadExtractors.js    # Role/team payload field extractors shared across components
│   │   ├── locationUtils.js        # Haversine distance calculation
│   │   ├── vacantRoleUtils.js      # Role status helpers (filled, closed, open) + display labels
│   │   ├── teamRequestUtils.js     # Invitation + application helper functions (build card data, labels)
│   │   ├── eventPreview.js         # Parse + format chat system event messages for previews and toasts
│   │   ├── roleEventMessages.js    # Build role event message strings (filled, closed, updated, deleted, reopened)
│   │   ├── chatEntityResolvers.js  # Resolve user/team entity objects from chat conversation payloads
│   │   ├── messageNotificationUtils.js # Unread count + notification badge helpers for chat
│   │   ├── fileExpiration.js       # File/image expiration status + formatted countdown strings
│   │   ├── dateHelpers.js          # Date formatting utilities
│   │   ├── debounce.js             # Generic debounce utility
│   │   ├── badgeIconUtils.jsx      # Badge icon component resolution by category
│   │   └── Colors.js              # Shared color constants for badge categories and UI accents
│   ├── constants/
│   │   ├── badgeConstants.js       # Badge category metadata (names, colors, icons)
│   │   ├── uiText.js               # Shared UI strings
│   │   └── pagination.js           # Pagination page-size defaults
│   ├── config/
│   │   └── imagekit.js             # ImageKit upload helper with folder routing
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
| `/` | Landing Page | Public homepage with feature overview |
| `/search` | Search | Find teams, users, and roles; Boolean search input; shared result-view toggle; advanced filtering by tags, badges, distance |
| `/teams/my-teams` | My Teams | Teams you belong to, pending invitations and applications; shared sort and result-view controls |
| `/profile` | Profile | Edit your profile, tags, avatar, and location |
| `/profile/:id` | Public Profile | View any user's profile; shows placeholder for deleted/missing users |
| `/chat` | Chat | Direct messages and team group chat with file/image sharing, @mentions, and reply threading |
| `/badges` | Badges | Browse all 30 badges across 5 categories |
| `/settings` | Settings | Change password and delete account |

---

## Search & Matching

The search page supports multiple sort and filter modes:

**Sort options:** Name (A–Z / Z–A), Newest, Recently updated, Best Match, Proximity (nearest / remote first), Capacity (member slots or open roles)

**Filter options:** Filter by tags, filter by badges, distance radius, open roles only, exclude teams you're already in, include/exclude demo data

**Responsive controls:** Search and My Teams share `FilterSortOptionButton` for compact sort/filter toolbar actions and `ResultViewToggle` for card, mini-card, list, and map/list view modes. These controls keep icon size, active state styling, spacing, and narrow-viewport alignment consistent across both pages.

**Best Match scoring** uses the backend matching engine (tag overlap 40%, badge overlap 30%, distance 30%) and falls back to client-side profile overlap calculations when backend scores aren't available.

**Map view** renders all results on a Leaflet map with color-coded markers. Clicking a marker shows a popup with the team/user/role card. Distance indicators show how far each result is from your location.

---

## Account Deletion

The deletion flow in Settings follows a three-step process:

1. **Password confirmation** — Validates identity before showing any impact data
2. **Impact preview** — Shows teams to be transferred (with successor override), teams to be deleted, roles to be reopened, and affected counts
3. **Confirm & execute** — Triggers the backend transaction; on success, logs out and redirects to home

All components handle deleted user references gracefully: chat messages show "Former Lomir User" with a grey avatar, badge awards preserve the badge but show a null awarder, and profile links show a placeholder page.

---

## Chat

The chat page supports both direct (1-to-1) and team group conversations.

**Messaging**
- Messages are delivered in real time via Socket.IO
- Typing indicators and read receipts are shown per conversation
- Messages can be replied to, edited, and soft-deleted; deleted messages show a placeholder

**@Mentions**
- Type `@` in the message input to open a dropdown of conversation participants
- Select a person or "All members" to insert a mention token
- Mention tokens render as styled `@Name` chips in message bubbles, reply previews, and notification toasts
- Unread @mention count is tracked separately and shown in the navbar badge

**File & image sharing**
- Images are uploaded to ImageKit and shown inline with a filename caption and a download overlay on hover
- Non-image files (PDFs, Word docs, spreadsheets, etc.) render as a downloadable card with icon, filename, and file size
- Excel / CSV files are labelled as "Spreadsheet"; other files as "File"
- Uploaded files expire after 60 days; messages show a countdown and a warning when expiry is within 7 days

**System event messages**
- Team actions (joins, role changes, invitations accepted/declined, ownership transfers) post styled event banners into the team chat automatically
- Role lifecycle events post dedicated banners: role filled (via application or invitation acceptance), role closed, role updated, role deleted, and role reopened — each with a distinct icon and colour
- Conversation list cards show a colour-coded icon and short preview for event messages instead of raw system text; notification toasts resolve the same icons and preview text

---

## Troubleshooting

- **CORS errors** — Make sure the backend is running on port 5001 and the frontend on 5173; check that `VITE_API_URL` matches
- **Socket.IO won't connect** — Verify `VITE_SOCKET_URL` in `.env` if you set it; otherwise the client falls back to `VITE_API_URL`
- **"Access denied. No token provided."** — Your JWT has expired; log out and log back in
- **CAPTCHA not showing locally** — Expected behavior; if `VITE_TURNSTILE_SITE_KEY` is unset, registration skips CAPTCHA
- **Images not uploading** — Check that `VITE_IMAGEKIT_PUBLIC_KEY` and `VITE_IMAGEKIT_URL_ENDPOINT` are set in `.env`
- **Map not rendering** — Leaflet CSS must be imported; check that `leaflet` and `react-leaflet` are installed

---

## Related

- **Backend repo:** [Lomir-backend](https://github.com/KasparSinitsin/Lomir-backend)
- **Account deletion spec:** Backend repo → `docs/USER_DELETION_SPEC.md`
