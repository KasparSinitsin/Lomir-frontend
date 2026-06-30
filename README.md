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

### Accounts & Demo Content

To test the live demo, just **register your own account** directly in the deployed app — open the app, sign up with a valid email address, confirm it via the verification link sent to you, and log in (no need to contact the developers). New profiles stay private until you make them public in settings.

> **Note on demo content:** Lomir currently shows many demo users, teams, and roles — while few real users have registered yet, this seed data gives visitors a realistic impression of the app's purpose and possibilities (and supports ongoing development and testing). You can hide all of it at any time via the demo-data filter in the search page's filter settings.

---

## Features

- **Search & Discovery** — Find teams, users, and vacant roles by keyword, tags, badges, or location; use Boolean search helpers, responsive filter/sort controls, and shared card/mini/list/map view toggles
- **Best Match Sorting** — Weighted matching algorithm scores teams and roles against your profile (tags 40%, badges 30%, distance 30%)
- **Map View** — Leaflet-powered map with custom markers for teams, users, and roles; popups with detail cards; distance-based filtering and proximity sorting
- **Team Management** — Create teams, manage members and roles, post vacant roles, handle applications and invitations with role-specific targeting; My Teams uses the same responsive sort and result-view controls as search
- **User Profiles** — Customizable profiles with interest tags, badges, avatar uploads (ImageKit), and geocoded location; profile header shows city and country code; non-public profiles are protected — non-owners and non-teammates see only the username and avatar ("This profile is private"); owners see public/private visibility indicators on profile, card, list, mini-card, and map views; signed-in users can block another profile from the user details modal
- **Real-Time Chat** — Direct and team group messaging with typing indicators, read receipts, file/image sharing, @mentions, reply threading, and rich system event messages (Socket.IO); blocked users are hidden from direct conversations, team rosters, mention lists, and rendered message streams
- **Badge System** — Browse 30 badges across 5 color-coded categories; award badges to teammates with reasons and team context
- **Notifications** — In-app notification center for invitations, applications, badge awards, and role updates
- **Account Deletion** — Multi-step account deletion with impact preview, automatic team ownership transfer, and graceful "Former Lomir User" handling across chat, badges, and notifications
- **Demo Data Indicators** — Synthetic/seed data is visually labeled with FlaskConical icons and "DEMO" avatar overlays so users can distinguish test content from real data
- **Contact Page** — Email contact form with optional multipart file attachments (up to 3 files, 5 MB each, 10 MB total — JPG, PNG, WebP, PDF, TXT, CSV); authenticated users with a configured contact user ID are routed directly to in-app chat instead; optional Turnstile CAPTCHA; privacy disclosure with `/privacy` link at submission; abuse/content reports show a persistent reference ID after submit
- **Authentication UX** — Login and forgot-password flows use shared floating screen alerts for submit-level errors such as rate limits, while field validation remains inline; registration surfaces backend validation details and username availability-check rate limits instead of generic "Invalid input data" errors
- **Security & Privacy** — the session is held in a backend-set `httpOnly` cookie rather than `localStorage`, so the auth token is never readable by JavaScript (XSS-resistant); requests and the realtime socket send it automatically via credentialed requests, and auth state is restored on load from `GET /api/auth/me`; Cloudflare Turnstile CAPTCHA on registration and contact form (feature-flagged), enforced password policy (min 8 chars, letter + number), self-service password reset from the login form; changing your password while logged in requires the current password, must differ from it, sends a confirmation email, and immediately invalidates every existing session on all devices (tokens issued before the change are rejected server-side, so you are logged out and redirected to sign in again); changing your account email requires confirming the new address via a verification link before it takes effect — the current email stays active until then; new accounts remain private after email verification until users change visibility in settings; users can manage a blocklist from Settings, with blocked relationships mutually anonymized across profiles, teams, roles, badge awards, invitations, and inline profile links; search results use approximate coordinates (~11km precision) so exact user locations are never exposed to the frontend; username availability feedback during registration is rate-limited while email availability is not exposed; separate age-16 confirmation checkbox at registration; timestamps and document versions stored for accepted Terms of Service, acknowledged Privacy Policy, and age confirmation; unverified accounts are automatically deleted after 24 hours

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
| Typography | Roboto (self-hosted woff2, GDPR-compliant — no Google CDN) |
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

# Optional Socket.IO override (defaults to http://localhost:5001 if unset)
# VITE_SOCKET_URL=http://localhost:5001

# ImageKit (image/file uploads — get values from the project owner)
VITE_IMAGEKIT_PUBLIC_KEY=<your-public-key>
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>

# Cloudflare Turnstile (configured in the deployed app; the widget stays hidden locally until a site key is set)
# VITE_TURNSTILE_SITE_KEY=<turnstile-site-key>

# Contact page — set to a Lomir user ID to route authenticated users to in-app chat
# VITE_LOMIR_CONTACT_USER_ID=<lomir-team-user-id>
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
│   └── fonts/                      # Self-hosted Roboto woff2 files (weights 300/400/500/700)
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
│   │   ├── PublicProfile.jsx       # Other users' public profiles; shows "private" message for
│   │   │                           #   limited-access profiles; placeholder for deleted users
│   │   ├── Register.jsx            # Multi-step registration with CAPTCHA
│   │   ├── Login.jsx
│   │   ├── Chat.jsx                # Direct + team messaging with file sharing; filters blocked users
│   │   ├── BadgeOverview.jsx       # Badge catalog and details
│   │   ├── Settings.jsx            # Visibility, blocklist, password/email changes (password change sends a
│   │   │                           #   confirmation email and logs you out of all sessions; email change sends
│   │   │                           #   a verification link) + account deletion modal
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── VerifyEmail.jsx
│   │   ├── VerifyEmailChange.jsx   # Confirms email-change links for logged-in users (verifying/success/error states)
│   │   ├── Contact.jsx             # Contact form with file attachments, report reference display,
│   │   │                           #   privacy notice, and in-app chat routing
│   │   └── LegalPage.jsx            # Shared page for /about, /terms, /privacy, /legal-notice
│   ├── components/
│   │   ├── BooleanSearchInput.jsx  # Textarea-based Boolean search input with operator helpers
│   │   ├── SearchHelp.jsx          # Search Tips popup panel
│   │   ├── auth/                   # LoginForm, RegisterForm
│   │   ├── teams/                  # TeamCard, TeamDetailsModal, TeamAvatar, TeamEditForm,
│   │   │                           #   TeamFocusAreaSection, TeamMembersSection, TeamRoleManager,
│   │   │                           #   VacantRoleCard, VacantRoleDetailsModal (lazy-loaded via VacantRoleDetailsModalLazy), VacantRolesSection,
│   │   │                           #   CreateTeamModal, CreateVacantRoleModal, RoleBadgeDropdown,
│   │   │                           #   TeamApplicationButton, TeamApplicationModal,
│   │   │                           #   TeamApplicationsModal, TeamApplicationDetailsModal,
│   │   │                           #   TeamInviteModal, TeamInvitesModal,
│   │   │                           #   TeamInvitationDetailsModal, RequestRoleCard
│   │   ├── users/                  # UserCard, UserDetailsModal, UserAvatar,
│   │   │                           #   UserProfileHeaderSection (avatar + name + location header),
│   │   │                           #   UserBioSection, InlineUserLink, BlocklistSection,
│   │   │                           #   DemoAvatarOverlay,
│   │   │                           #   DeletedUserProfilePlaceholder
│   │   ├── badges/                 # Badge display, awarding, category modals, AwardCard
│   │   ├── tags/                   # Tag input, display, and selection
│   │   ├── chat/                   # Chat UI, message bubbles, file/image previews,
│   │   │                           #   MentionDropdown, MessageText (mentions + URLs),
│   │   │                           #   reply previews, system event messages.
│   │   │                           #   MessageDisplay.jsx is a thin orchestrator after the
│   │   │                           #   Stage 1–4c decomposition; extracted modules:
│   │   │                           #   messageEventRenderers.jsx (createEventRenderers(ctx)
│   │   │                           #   factory for the 29 system/event renderers),
│   │   │                           #   MessageBubble.jsx, ReadReceipt.jsx, FileAttachment.jsx
│   │   ├── search/                 # SearchMapView (Leaflet map with markers/popups)
│   │   ├── common/                 # Shared UI primitives and composed widgets:
│   │   │                           #   Button, Card, Modal, Alert, Pagination, Tooltip,
│   │   │                           #   Input, Select, Checkbox, Dropdown, FormGroup,
│   │   │                           #   FormSectionDivider, DataDisplay, InfoCard, Placeholder,
│   │   │                           #   ImageUploader, LocationInput, LocationDisplay,
│   │   │                           #   LocationSection, LocationModeToggle, CountrySelect,
│   │   │                           #   TurnstileWidget, FilterSortOptionButton, ResultViewToggle,
│   │   │                           #   ListViewRow, CardMetaItem, CardMetaRow, RoleBadgePill,
│   │   │                           #   MatchScoreOverlay, MatchScoreSubtitle, MatchScoreSection,
│   │   │                           #   SearchResultTypeOverlay, NotificationBadge,
│   │   │                           #   PersonRequestCard, RequestListModal, SendMessageButton,
│   │   │                           #   VisibilityToggle, ScreenAlert, ConfirmModal,
│   │   │                           #   ErrorBoundary
│   │   └── layout/                 # Navbar, Footer, PageContainer, ProtectedRoute, Grid, Section
│   ├── contexts/
│   │   ├── AuthContext.jsx         # Authentication state (httpOnly cookie session, restored via /api/auth/me) and block relationship state
│   │   ├── UserModalContext.jsx    # Global user detail modal stack
│   │   ├── TeamModalContext.jsx    # Global team detail modal state
│   │   ├── ToastContext.jsx        # Toast notification state + dispatch
│   │   └── ModalLayerContext.jsx   # Modal z-index stacking
│   ├── lib/
│   │   └── queryClient.js          # TanStack React Query client configuration
│   ├── services/
│   │   ├── api.js                  # Axios instance with default camelCase ↔ snake_case interceptors;
│   │   │                           #   preserves FormData requests so multipart boundaries are set by
│   │   │                           #   the browser; call sites can opt out via skipRequestCaseTransform /
│   │   │                           #   skipResponseCaseTransform for explicit per-call data contracts
│   │   ├── userService.js          # Profile, avatar, blocklist, account deletion, and email-change verification endpoints
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
│   │   ├── useTeamQueries.js       # React Query hooks for the paginated user-teams list and bulk member badges (MyTeams)
│   │   ├── useSearchQueries.js     # React Query hook for the global search (SearchPage): whole criteria object as query key, keepPreviousData
│   │   ├── useChatQueries.js       # React Query hooks for Chat: team-details cache + conversation list (staleTime: Infinity, socket-maintained)
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
│   │   ├── useAwardModals.js       # Badge award modal state management (user profile context)
│   │   ├── useTeamAwardModals.js   # Badge award modal state management (team context)
│   │   └── useTheme.js             # Theme toggle state
│   ├── utils/
│   │   ├── formatters.js           # camelCase ↔ snake_case conversion (used by api.js interceptors)
│   │   ├── deletedUser.js          # "Former Lomir User" display utilities + FormerUserAvatar
│   │   ├── userHelpers.js          # Initials, display names, isSynthetic* helpers, demo tooltips
│   │   ├── nameFormatters.js       # Middle-name abbreviation and display name formatting
│   │   ├── teamMatchUtils.js       # Team/role match scoring + overlap calculations
│   │   ├── matchHelpers.js         # Shared match score helpers (weights, render cascade)
│   │   ├── matchScoreUtils.js      # Match tier color coding (green/yellow/orange)
│   │   ├── listSummaryUtils.js     # extractNames + summarizeList for tag/badge summary strings
│   │   ├── payloadExtractors.js    # Role/team payload field extractors shared across components
│   │   ├── locationUtils.js        # Haversine distance, formatLocation / normalizeLocationData
│   │   │                           #   (de-duplicated city/district/state/country display,
│   │   │                           #   postal-code city fallback, Berlin district lookup)
│   │   ├── vacantRoleUtils.js      # Role status helpers (filled, closed, open) + display labels
│   │   ├── teamRequestUtils.js     # Invitation + application helper functions (build card data, labels)
│   │   ├── eventPreview.js         # Parse + format chat system event messages for previews and toasts
│   │   ├── roleEventMessages.js    # Build role event message strings (filled, closed, updated, deleted, reopened)
│   │   ├── chatEntityResolvers.js  # Resolve user/team entity objects from chat conversation payloads
│   │   ├── messageSystemParser.js  # parseSystemMessage: parse chat system/event message payloads (MessageDisplay)
│   │   ├── messageDisplayHelpers.js # Pure MessageDisplay helpers: getEventReactionPreview, formatReplyTooltipText, getFileIcon
│   │   ├── messageDisplayRenderers.jsx # JSX render helpers for MessageDisplay: renderReplyContent, renderHighlightedSearchText
│   │   ├── messageNotificationUtils.js # Unread count + notification badge helpers for chat
│   │   ├── fileExpiration.js       # File/image expiration status + formatted countdown strings
│   │   ├── dateHelpers.js          # Date formatting utilities
│   │   ├── debounce.js             # Generic debounce utility
│   │   ├── badgeIconUtils.jsx      # Badge icon component resolution by category
│   │   └── Colors.js               # Shared color constants for badge categories and UI accents
│   ├── constants/
│   │   ├── badgeConstants.js       # Badge category metadata (names, colors, icons)
│   │   ├── privacyText.js          # Shared privacy, storage, upload, and visibility notices
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
| `/login` | Login | Sign in, register redirect, and forgot-password entry point |
| `/register` | Register | Multi-step registration with legal consent, private-by-default visibility copy, username availability helper, and optional Turnstile |
| `/verify-email` | Verify Email | Confirms new-account email verification links before login |
| `/verify-email-change` | Verify Email Change | Confirms an email-change link for a logged-in user and updates the account email |
| `/forgot-password` | Forgot Password | Request a password reset email |
| `/reset-password` | Reset Password | Set a new password from a reset email link |
| `/search` | Search | Find teams, users, and roles; Boolean search input; shared result-view toggle; advanced filtering by tags, badges, distance |
| `/teams/my-teams` | My Teams | Teams you belong to, pending invitations and applications; shared sort and result-view controls |
| `/profile` | Profile | Edit your profile, tags, avatar, and location |
| `/profile/:id` | Public Profile | View any user's profile; shows "private" message for non-public profiles; placeholder for deleted users |
| `/chat` | Chat | Direct messages and team group chat with file/image sharing, @mentions, and reply threading |
| `/badges` | Badges | Browse all 30 badges across 5 categories |
| `/settings` | Settings | Change profile visibility, manage blocked users, update password (logs you out of all sessions and sends a confirmation email), request a verified email change, and delete account |
| `/contact` | Contact | Email form with file attachments and privacy notice; abuse/content reports show a reference ID; authenticated users with a contact user ID configured are routed to in-app chat |
| `/about` | About | Project description, status, and contact information |
| `/terms` | Terms | Full Terms of Service (14 sections, German law) |
| `/privacy` | Privacy | Full GDPR-aligned Privacy Policy (19 sections) |
| `/legal-notice` | Legal Notice / Impressum | Legal notice per DDG §5 |

---

## Search & Matching

The search page supports multiple sort and filter modes:

**Sort options:** Name (A–Z / Z–A), Newest, Recently updated, Best Match, Proximity (nearest / remote first), Capacity (member slots or open roles)

**Filter options:** Filter by tags, filter by badges, distance radius, open roles only, exclude teams you're already in, include/exclude demo data

**Responsive controls:** Search and My Teams share `FilterSortOptionButton` for compact sort/filter toolbar actions and `ResultViewToggle` for card, mini-card, list, and map/list view modes. These controls keep icon size, active state styling, spacing, and narrow-viewport alignment consistent across both pages.

**Best Match scoring** uses the backend matching engine (tag overlap 40%, badge overlap 30%, distance 30%) and falls back to client-side profile overlap calculations when backend scores aren't available.

**Map view** renders all results on a Leaflet map with color-coded markers. Clicking a marker shows a popup with the team/user/role card. Distance indicators show how far each result is from your location. Map markers use approximate coordinates (~11km precision) returned by the backend — exact user locations are never sent to the client.

**Distance on role cards** — Vacant role cards and mini-cards show a distance indicator (km) when search results include proximity data.

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

**Blocking**
- Blocking a user removes unavailable direct conversations from the chat list and closes the active direct conversation if the relationship changes while it is open
- Team chats stay available, but blocked members are filtered out of rosters, mention suggestions, and the visible message stream
- Socket.IO `blocks:updated` events refresh block relationships without requiring a page reload

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

**Render resilience**
- Chat routes are wrapped in a small `ErrorBoundary` so unexpected render errors show a visible fallback instead of a blank white screen
- Individual message bubbles are also isolated by an error boundary; if a legacy message payload fails to render, the rest of the conversation remains usable

---

## Troubleshooting

- **CORS errors** — Make sure the backend is running on port 5001 and the frontend on 5173; check that `VITE_API_URL` matches
- **Local auth suddenly logs out / "No token provided"** — Use the same host for frontend and backend during local development. With `VITE_API_URL=http://localhost:5001`, open the frontend via `http://localhost:5173` (or the actual localhost port Vite prints), not `http://127.0.0.1:5173`, because cookies are host-scoped.
- **Socket.IO won't connect** — Verify `VITE_SOCKET_URL` in `.env` if you set it; otherwise the client falls back to `http://localhost:5001`
- **"Access denied. No token provided."** — Your session cookie is missing or expired; log out and log back in (and ensure the API is reached over a credentialed/CORS-allowed origin so the cookie is sent)
- **CAPTCHA not showing locally** — Expected when no Turnstile site key is configured; the CAPTCHA is active in the deployed app
- **Images not uploading** — Check that `VITE_IMAGEKIT_PUBLIC_KEY` and `VITE_IMAGEKIT_URL_ENDPOINT` are set in `.env`
- **Map not rendering** — Leaflet CSS must be imported; check that `leaflet` and `react-leaflet` are installed

---

## Related

- **Backend repo:** [Lomir-backend](https://github.com/KasparSinitsin/Lomir-backend)
- **Account deletion spec:** Backend repo → `docs/USER_DELETION_SPEC.md`

---

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See the [LICENSE](LICENSE) file for the full text.
