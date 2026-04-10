# English Tutor AI - Comprehensive Developer Documentation

**Last Updated**: 2026-04-11
**Version**: 2.1.0

---

## 1. PROJECT OVERVIEW
- **Project Name**: English Tutor AI (VoiceGPT Advanced)
- **Description**: An advanced AI-powered English speaking practice platform that provides real-time feedback on grammar, pronunciation, vocabulary, and fluency using the Web Speech API and state-of-the-art LLMs.
- **Main Purpose**: To provide a safe, encouraging, and highly interactive environment for English learners to practice speaking and receive instant, constructive feedback.
- **Target Audience**: ESL (English as a Second Language) learners of all levels (Beginner to Native) seeking to improve their speaking confidence and accuracy.

---

## 2. TECH STACK
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (SpeechRecognition & SpeechSynthesis).
- **Styling**: Vanilla CSS3 with CSS Custom Properties (Variables), Flexbox, Grid, and [Font Awesome 6.4.0](https://fontawesome.com/) for iconography.
- **Backend**: [Node.js](https://nodejs.org/) with [Express.js](https://expressjs.com/).
- **Real-time Communication**: [Socket.IO](https://socket.io/) for low-latency, bidirectional communication between the client and server.
- **AI Integration**: [OpenRouter API](https://openrouter.ai/) (unified interface for GPT-4, Claude 3, Gemini Pro, etc.).
- **Database**: Client-side `localStorage` for persistent conversation history, theme preferences, and learning metrics.
- **Security**: [Helmet.js](https://helmetjs.github.io/) for CSP/security headers, [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) for API protection.
- **Compression**: [compression](https://www.npmjs.com/package/compression) middleware for faster asset delivery.
- **Package Manager**: `npm`.
- **Deployment**: Configured for [Heroku](https://www.heroku.com/) via `Procfile` and `app.json`.

---

## 3. FILE STRUCTURE

```text
English-Tutor-AI/
├── .cursor/                # Cursor IDE specific settings
├── .vscode/                # VS Code specific settings
├── public/                 # Static assets and frontend source
│   ├── css/
│   │   └── style.css       # Global styles, themes, and animations
│   ├── images/             # Documentation screenshots and UI assets
│   └── js/
│       ├── microphone-fix.js # Browser compatibility polyfills for audio
│       └── script.js       # Core frontend logic (Speech API, Socket.IO, State)
├── views/                  # Frontend templates
│   └── index.html          # Main Single Page Application (SPA) structure
├── .gitignore              # Git ignore rules
├── .env                    # Local environment variables (not in version control)
├── env.example             # Template for required environment variables
├── index.js                # Backend server, API routes, and Socket.IO logic
├── package.json            # Project dependencies, metadata, and scripts
├── Procfile                # Heroku process file
├── app.json                # Heroku application configuration
└── README.md               # User-facing project documentation
```

### Architectural Decisions
- **Vanilla Frontend**: Avoided heavy frameworks (React/Vue) to ensure direct, low-latency access to the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) and minimize bundle size.
- **Socket.IO over REST**: Chosen for the chat interface to support real-time "AI is typing" indicators and immediate response delivery without polling.
- **Centralized AppState**: A single source of truth in `public/js/script.js` manages all learning metrics, UI states, and user preferences.

---

## 4. KEY COMPONENTS

### Frontend (script.js)
- **`AppState`**: 
  - **Purpose**: Global state object tracking recording status, theme, scores (grammar, pronunciation, etc.), and session metrics.
  - **File Path**: [script.js](file:///Users/abhijayhome/projects/English-Tutor-AI/public/js/script.js)
  - **Dependencies**: `localStorage`, `Socket.IO`.
- **`SpeechRecognition` (Web Speech API)**:
  - **Purpose**: Real-time voice-to-text conversion.
  - **Events**: `onstart`, `onresult`, `onerror`, `onend`.
- **`speechSynthesis` (Web Speech API)**:
  - **Purpose**: Text-to-speech engine for AI tutor responses.
- **`initializeSpeechRecognition()`**:
  - **Purpose**: Configures the recognition engine (continuous mode, interim results) and attaches event handlers.
- **`updateProgressDisplay()`**:
  - **Purpose**: Synchronizes the `AppState` scores with the UI dashboard cards.

### Backend (index.js)
- **`PERSONALITY_PROMPTS`**:
  - **Purpose**: A dictionary of system prompts defining the behavior of different tutor roles (e.g., `grammar_tutor`, `pronunciation_coach`).
  - **File Path**: [index.js](file:///Users/abhijayhome/projects/English-Tutor-AI/index.js)
- **`io.on("connection", ...)`**:
  - **Purpose**: Manages WebSocket lifecycle, client tracking, and message routing.
- **`makeAPICallWithRetry()`**:
  - **Purpose**: Handles requests to OpenRouter with built-in retry logic and error handling.

---

## 5. ROUTING STRUCTURE

### Backend Routes (Express)
- **GET `/`**: Serves the main [index.html](file:///Users/abhijayhome/projects/English-Tutor-AI/views/index.html).
- **GET `/health`**: Health check endpoint returning uptime, memory usage, and version.
- **GET `/api/models`**: Fetches available AI models (GPT-3.5, GPT-4, etc.) for the settings panel.
- **GET `/api/personalities`**: Returns available tutor personalities and their descriptions.

### Frontend Navigation
- **SPA Logic**: The app uses a single-page architecture. Different "modes" (Conversation, Grammar, Scenario) are handled by updating `AppState.learningMode` and toggling CSS classes on the `mode-card` elements.

---

## 6. API ENDPOINTS & SOCKET EVENTS

### Socket.IO Events
- **`chat message` (Client -> Server)**:
  - **Payload**: `{ text, model, personality, language, history }`
  - **Purpose**: Sends user transcript and context to the AI.
- **`bot response` (Server -> Client)**:
  - **Payload**: `{ text }`
  - **Purpose**: Delivers the AI tutor's response.
- **`typing` (Server -> Client)**:
  - **Purpose**: Triggers the visual typing indicator in the UI.

---

## 7. STYLING SYSTEM
- **Methodology**: Utility-first CSS using CSS Variables (`:root`) for easy theming and consistent spacing.
- **Themes**: Support for `light` (default) and `dark` modes via the `[data-theme="dark"]` attribute on the `<html>` or `<body>` tag.
- **Global Styles**: Defined in [style.css](file:///Users/abhijayhome/projects/English-Tutor-AI/public/css/style.css).
- **Responsive Breakpoints**:
  - Desktop: Default
  - Tablet: `max-width: 992px`
  - Mobile: `max-width: 768px` (handled via `@media` queries in [style.css](file:///Users/abhijayhome/projects/English-Tutor-AI/public/css/style.css)).

---

## 8. ENVIRONMENT VARIABLES
| Variable | Purpose | Location |
|----------|---------|----------|
| `PORT` | The port the Express server runs on (default: 3000). | `index.js` |
| `OPENROUTER_API_KEY` | API key for OpenRouter to access LLMs. | `index.js` |
| `NODE_ENV` | Environment mode (`development` or `production`). | `index.js` |

---

## 9. SCRIPTS & COMMANDS
```bash
npm start          # Runs the production server using node
npm run dev        # Runs the server with nodemon for auto-reloading
npm run lint       # Runs ESLint to check for code quality issues
npm run format     # Formats the codebase using Prettier
```

---

## 10. DEPENDENCIES
- **`express`**: Web framework for the backend.
- **`socket.io`**: Real-time communication layer.
- **`axios`**: HTTP client for making requests to OpenRouter.
- **`ejs`**: Template engine (though currently serving static HTML, it's available for dynamic views).
- **`dotenv`**: For managing environment variables.
- **`helmet` & `express-rate-limit`**: Security and API protection.
- **`compression`**: Gzip compression for middleware.

---

## 11. DEPLOYMENT NOTES
- **Build Process**: No explicit build step required (Vanilla JS). Ensure `npm install` is run on the server.
- **Heroku Setup**:
  - Uses `Procfile` for process management (`web: node index.js`).
  - `app.json` defines the environment requirements.
- **Environment Setup**: Ensure `OPENROUTER_API_KEY` is set in the hosting provider's config variables.

---

## 12. FUTURE SECTIONS (TODO)
- [ ] **Database Integration**: Migrate `localStorage` to a persistent database (e.g., MongoDB/PostgreSQL) for cross-device sync.
- [ ] **User Authentication**: Implement JWT or OAuth for personalized user accounts.
- [ ] **Advanced Analytics**: Add deeper NLP analysis for specific grammar error patterns.
- [ ] **Mobile App**: Consider Capacitor or React Native wrapper for mobile-first experience.

---
[End of Documentation]
