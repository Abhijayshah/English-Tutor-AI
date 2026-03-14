# English Tutor AI - Project Documentation for Developers

**Last Updated**: 2026-03-15  
**Version**: 2.0.0

---

## 1. PROJECT OVERVIEW
- **Project Name**: English Tutor AI (VoiceGPT Advanced)
- **Description**: An AI-powered English speaking practice platform that provides real-time feedback on grammar, pronunciation, vocabulary, and fluency.
- **Main Purpose**: To help English learners improve their speaking skills through interactive, AI-driven conversations.
- **Target Audience**: Non-native English speakers looking for a safe, encouraging environment to practice speaking.

---

## 2. TECH STACK
- **Frontend**: Vanilla HTML/JavaScript (Web Speech API for recognition and synthesis).
- **Styling**: Vanilla CSS with CSS Custom Properties (Variables) for theme support and Font Awesome for icons.
- **Backend**: Node.js with [Express.js](https://expressjs.com/).
- **Real-time Communication**: [Socket.IO](https://socket.io/) for bidirectional, event-based communication between client and server.
- **AI Integration**: [OpenRouter API](https://openrouter.ai/) for accessing various AI models (GPT-3.5, GPT-4, Claude 3, Gemini Pro).
- **Database**: None (Uses local storage for persistence and in-memory tracking for active sessions).
- **Package Manager**: [npm](https://www.npmjs.com/).
- **Deployment**: [Heroku](https://www.heroku.com/) (configured via `Procfile` and `app.json`).
- **Security**: [Helmet](https://helmetjs.github.io/) for security headers and [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) for API protection.

---

## 3. FILE STRUCTURE

```text
English-Tutor-AI/
├── .cursor/                # Cursor IDE settings
├── public/                 # Static assets and frontend source
│   ├── css/
│   │   └── style.css       # Global styles and theme definitions
│   ├── images/             # Screenshots and UI assets
│   └── js/
│       ├── microphone-fix.js # Mobile/Browser microphone compatibility fixes
│       └── script.js       # Core frontend logic (Web Speech API, Socket.IO)
├── views/                  # Frontend templates
│   └── index.html          # Main application UI
├── .gitignore              # Files to ignore in Git
├── env.example             # Environment variable template
├── index.js                # Backend entry point and AI logic
├── package.json            # Dependencies and npm scripts
├── Procfile                # Heroku deployment configuration
└── README.md               # Project overview for users
```

### Architectural Decisions
- **Vanilla JS/CSS/HTML**: Chosen to minimize overhead and ensure maximum compatibility with the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), which can be sensitive to framework-specific DOM manipulation.
- **Socket.IO for Chat**: Enables low-latency, real-time feedback loops, crucial for a conversational experience.
- **OpenRouter for AI**: Provides a unified interface to multiple AI models, allowing the platform to switch between providers (OpenAI, Anthropic, Google) without changing the core logic.

---

## 4. KEY COMPONENTS

### Frontend (script.js)
- **AppState**: 
  - **Purpose**: Manages global state including recording status, theme, history, and learning metrics.
  - **File Path**: `public/js/script.js`
  - **Dependencies**: `localStorage`, `Socket.io`.
- **SpeechRecognition**:
  - **Purpose**: Captures user voice and converts it to text.
  - **File Path**: `public/js/script.js` (Web Speech API).
- **SpeechSynthesis**:
  - **Purpose**: Converts AI tutor's text response into speech.
  - **File Path**: `public/js/script.js` (Web Speech API).
- **initializeSpeechRecognition()**:
  - **Purpose**: Configures and initializes the recognition engine with event listeners for speech start, end, and results.

### Backend (index.js)
- **PERSONALITY_PROMPTS**:
  - **Purpose**: Defines system instructions for various tutor roles (Grammar, Pronunciation, Fluency).
- **analyzeSpeechForLearning(text, level, mode)**:
  - **Purpose**: Analyzes the raw transcript for errors and calculates scores before sending it to the AI.
- **makeAPICallWithRetry(requestData, maxRetries)**:
  - **Purpose**: Robust API interaction with OpenRouter, including exponential backoff for rate limits.

---

## 5. ROUTING STRUCTURE

### Backend Routes
- **GET `/`**: Serves the `views/index.html` main page.
- **GET `/health`**: Returns the server's health status, uptime, and memory usage.
- **GET `/api/models`**: Returns a list of available AI models from OpenRouter.
- **GET `/api/personalities`**: Returns a list of available tutor personalities with descriptions.

### Frontend Routing
- The application is a **Single Page Application (SPA)**. Navigation between modes and settings is handled by JS by toggling visibility of DOM elements.

---

## 6. API ENDPOINTS

### Socket.IO Events
- **`connection`**: Triggered when a client connects. Server sends `connection-confirmed`.
- **`chat message` (Client -> Server)**:
  - **Request Body**: `{ text, model, personality, learningMode, difficultyLevel, feedbackStyle }`
- **`tutor response` (Server -> Client)**:
  - **Response Body**: `{ reply, speechAnalysis, learningFeedback, metadata }`
- **`ping` / `pong`**: Connection health checks.

---

## 7. STYLING SYSTEM

### Methodology
- Uses **CSS Custom Properties** (Variables) for theming and consistency.
- **Global Styles**: Defined in `public/css/style.css` under the `:root` selector.
- **Theme Support**: Dark mode is activated by setting `data-theme="dark"` on the `<html>` element.

### Key Design Tokens
- **Colors**: `--primary-color`, `--secondary-color`, `--success-color`, `--error-color`.
- **Animations**: `--transition` for smooth transitions between themes and UI states.
- **Responsive Breakpoints**:
  - **Mobile**: Up to 768px (Cards stacked, menu simplified).
  - **Desktop**: 769px and above (Grid layout for modes).

---

## 8. ENVIRONMENT VARIABLES

| Variable | Purpose | Usage |
|----------|---------|-------|
| `OPENAI_API_KEY` | OpenRouter API key | Authenticating with AI provider |
| `PORT` | Server port | Setting the listening port (default: 3000) |
| `NODE_ENV` | Environment mode | Configuring CORS and logging (development/production) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit duration | `express-rate-limit` configuration |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `express-rate-limit` configuration |

---

## 9. SCRIPTS & COMMANDS

```bash
# Start the production server
npm start

# Start the development server with auto-reload (nodemon)
npm run dev

# Lint the codebase
npm run lint

# Format the code using Prettier
npm run format
```

---

## 10. DEPENDENCIES

### Core Dependencies
- **express**: Backend framework.
- **socket.io**: Real-time communication.
- **axios**: HTTP client for API requests.
- **helmet / compression**: Security and performance middleware.
- **ejs**: View engine (though currently mostly static HTML is used).
- **dotenv**: Environment variable management.

### Dev Dependencies
- **nodemon**: Development server watcher.
- **eslint / prettier**: Code quality and formatting.

---

## 11. DEPLOYMENT NOTES
- **Platform**: Designed for Heroku or any Node.js compatible host.
- **Build Process**: No specific build step required as it uses vanilla JS/CSS.
- **Prerequisites**: Ensure `OPENAI_API_KEY` is set in the production environment variables.

---

## 12. FUTURE SECTIONS (Placeholder)
- [Add details about database integration here]
- [Add details about user authentication here]
- [Add details about advanced speech analytics here]

---

**TODO**:
- [ ] Implement database for persistent user progress tracking.
- [ ] Add user authentication (OAuth).
- [ ] Expand pronunciation feedback with phonetic analysis.
