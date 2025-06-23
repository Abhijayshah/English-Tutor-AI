# VoiceGPT Advanced 🎤🤖

An advanced voice-enabled AI chatbot with modern UI, multiple AI models, conversation history, and comprehensive features for an enhanced user experience.

![VoiceGPT Advanced](https://img.shields.io/badge/VoiceGPT-Advanced-blue)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 Core Features
- **Voice Recognition**: Browser-native speech-to-text using Web Speech API
- **Text-to-Speech**: Natural voice responses with customizable voices
- **Real-time Communication**: WebSocket-based instant messaging
- **Multiple AI Models**: Support for GPT-3.5, GPT-4, Claude, and more
- **Conversation History**: Persistent chat history with local storage

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface with smooth animations
- **Dark/Light Theme**: Toggle between themes with persistent preference
- **Voice Visualization**: Real-time audio waveform display during recording
- **Loading Indicators**: Beautiful typing animations and status feedback
- **Toast Notifications**: User-friendly error and success messages

### 🔧 Advanced Settings
- **AI Personality**: Choose from 5 different AI personalities
- **Multi-language Support**: 10+ languages for speech recognition
- **Voice Selection**: Choose from available system voices
- **Model Selection**: Switch between different AI models on-the-fly

### 🛡️ Security & Performance
- **Rate Limiting**: Prevents API abuse with configurable limits
- **Security Headers**: Helmet.js for enhanced security
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Recovery**: Automatic retry logic with exponential backoff
- **Graceful Shutdown**: Proper cleanup on server termination

### ⌨️ Accessibility
- **Keyboard Shortcuts**: Full keyboard navigation support
- **ARIA Labels**: Screen reader compatibility
- **Focus Management**: Proper focus handling for accessibility
- **Reduced Motion**: Respects user's motion preferences

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+
- OpenRouter API key ([Get one here](https://openrouter.ai/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-speech-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENAI_API_KEY=your_openrouter_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎮 Usage

### Basic Usage
1. **Click the microphone button** to start voice recognition
2. **Speak your message** clearly into the microphone
3. **Wait for the AI response** - it will be both displayed and spoken
4. **View conversation history** in the chat panel above

### Advanced Features

#### Settings Panel
- Click the **gear icon** to open settings
- **AI Model**: Choose between GPT-3.5, GPT-4, Claude models
- **Language**: Select your preferred language for speech recognition
- **Voice**: Choose from available system voices for responses
- **Personality**: Select AI personality (Helpful, Creative, Technical, Casual, Professional)

#### Keyboard Shortcuts
- **Space**: Toggle voice recording
- **Escape**: Close settings panel or notifications
- **Ctrl/Cmd + M**: Toggle mute
- **Ctrl/Cmd + T**: Toggle theme

#### Voice Controls
- **Microphone Button**: Start/stop voice recording
- **Settings Button**: Open configuration panel
- **Mute Button**: Disable/enable voice responses
- **Stop Button**: Stop current speech synthesis

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenRouter API key | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Available AI Models

| Model | Provider | Description |
|-------|----------|-------------|
| `openai/gpt-3.5-turbo` | OpenAI | Fast, efficient general-purpose model |
| `openai/gpt-4` | OpenAI | Most capable OpenAI model |
| `anthropic/claude-3-haiku` | Anthropic | Fast Claude model |
| `anthropic/claude-3-sonnet` | Anthropic | Balanced Claude model |
| `google/gemini-pro` | Google | Google's advanced model |

### Personality Types

| Personality | Description |
|-------------|-------------|
| **Helpful** | Friendly, clear, and useful responses |
| **Creative** | Imaginative and innovative responses |
| **Technical** | Detailed technical information and examples |
| **Casual** | Relaxed, conversational tone |
| **Professional** | Formal, business-appropriate responses |

## 🌐 Browser Support

### Speech Recognition
- Chrome 25+
- Edge 79+
- Safari 14.1+
- Firefox (limited support)

### Speech Synthesis
- Chrome 33+
- Edge 14+
- Safari 7+
- Firefox 49+

## 📱 Mobile Support

The application is fully responsive and works on mobile devices, though speech recognition support may vary by browser and device.

## 🔍 API Endpoints

### Health Check
```
GET /health
```
Returns server status and metrics.

### Available Models
```
GET /api/models
```
Returns list of supported AI models.

### Personalities
```
GET /api/personalities
```
Returns available AI personalities.

## 🛠️ Development

### Development Mode
```bash
npm run dev
```
Starts the server with nodemon for automatic restarts.

### Code Formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

## 🐛 Troubleshooting

### Common Issues

**Microphone not working**
- Ensure microphone permissions are granted
- Check if another application is using the microphone
- Try refreshing the page

**API errors**
- Verify your OpenRouter API key is correct
- Check your internet connection
- Monitor rate limits

**Speech synthesis not working**
- Check browser compatibility
- Ensure audio is not muted
- Try different voices in settings

### Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Speech recognition not supported" | Browser incompatibility | Use Chrome/Edge/Safari |
| "Microphone access denied" | Permission not granted | Allow microphone access |
| "Too many requests" | Rate limit exceeded | Wait before making more requests |
| "Network error" | Connection issues | Check internet connection |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Web Speech API for browser speech capabilities
- Socket.IO for real-time communication
- Font Awesome for icons

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ by the VoiceGPT Team** 