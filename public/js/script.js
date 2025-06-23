'use strict';

// Global variables and configuration
const CONFIG = {
  defaultLanguage: 'en-US',
  defaultModel: 'openai/gpt-3.5-turbo',
  defaultPersonality: 'helpful',
  maxHistoryItems: 50,
  speechTimeout: 5000,
  retryAttempts: 3
};

// Enhanced Application state for comprehensive scoring
const AppState = {
  isRecording: false,
  isMuted: false,
  currentTheme: localStorage.getItem('theme') || 'light',
  conversationHistory: JSON.parse(localStorage.getItem('conversationHistory')) || [],
  
  // Learning-specific state
  learningMode: localStorage.getItem('learningMode') || 'conversation',
  tutorMode: localStorage.getItem('tutorMode') || 'conversation_partner',
  difficultyLevel: localStorage.getItem('difficultyLevel') || 'intermediate',
  feedbackStyle: localStorage.getItem('feedbackStyle') || 'gentle',
  sessionLength: localStorage.getItem('sessionLength') || 'unlimited',
  selectedScenario: localStorage.getItem('selectedScenario') || '',
  scenarioContext: '',
  
  // Enhanced Progress tracking with detailed metrics
  sessionStartTime: null,
  sessionDuration: 0,
  wordsSpoken: 0,
  messagesCount: 0,
  
  // Comprehensive scoring system (0-100)
  scores: {
    grammar: parseInt(localStorage.getItem('grammarScore')) || 75,
    pronunciation: parseInt(localStorage.getItem('pronunciationScore')) || 78,
    vocabulary: parseInt(localStorage.getItem('vocabularyScore')) || 82,
    fluency: parseInt(localStorage.getItem('fluencyScore')) || 80,
    overall: parseInt(localStorage.getItem('overallScore')) || 79
  },
  
  // Detailed analytics
  analytics: {
    totalSessions: parseInt(localStorage.getItem('totalSessions')) || 0,
    totalMinutes: parseInt(localStorage.getItem('totalMinutes')) || 0,
    streakDays: parseInt(localStorage.getItem('streakDays')) || 7,
    lastSessionDate: localStorage.getItem('lastSessionDate') || new Date().toDateString(),
    weakAreas: JSON.parse(localStorage.getItem('weakAreas')) || [],
    strongAreas: JSON.parse(localStorage.getItem('strongAreas')) || [],
    improvementSuggestions: JSON.parse(localStorage.getItem('improvementSuggestions')) || []
  },
  
  // Session-specific tracking
  currentSession: {
    startTime: null,
    messagesCount: 0,
    wordsSpoken: 0,
    grammarErrors: 0,
    pronunciationIssues: 0,
    vocabularyUsed: new Set(),
    fluencyScore: 0,
    interactions: []
  },
  
  settings: {
    aiModel: localStorage.getItem('aiModel') || CONFIG.defaultModel,
    language: localStorage.getItem('language') || CONFIG.defaultLanguage,
    selectedVoice: localStorage.getItem('selectedVoice') || ''
  }
};

// Initialize Socket.IO
const socket = io();

// DOM Elements
const elements = {
  // Output elements
  outputYou: document.querySelector('.output-you'),
  outputBot: document.querySelector('.output-bot'),
  chatHistory: document.getElementById('chat-history'),
  
  // Control buttons
  micBtn: document.getElementById('mic-btn'),
  themeBtn: document.getElementById('theme-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  muteBtn: document.getElementById('mute-btn'),
  stopBtn: document.getElementById('stop-btn'),
  closeSettingsBtn: document.getElementById('close-settings'),
  clearHistoryBtn: document.getElementById('clear-history'),
  
  // Settings panel
  settingsPanel: document.getElementById('settings-panel'),
  tutorModeSelect: document.getElementById('tutor-mode'),
  difficultyLevelSelect: document.getElementById('difficulty-level'),
  feedbackStyleSelect: document.getElementById('feedback-style'),
  languageSelect: document.getElementById('language-select'),
  voiceSelect: document.getElementById('voice-select'),
  sessionLengthSelect: document.getElementById('session-length'),
  
  // Status and loading
  connectionStatus: document.getElementById('connection-status'),
  statusText: document.getElementById('status-text'),
  loadingIndicator: document.getElementById('loading-indicator'),
  voiceVisualizer: document.getElementById('voice-visualizer'),
  visualizerCanvas: document.getElementById('visualizer-canvas'),
  
  // Toast
  errorToast: document.getElementById('error-toast'),
  toastMessage: document.getElementById('toast-message')
};

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let availableVoices = [];

// Audio Context for Voice Visualization
let audioContext = null;
let analyser = null;
let microphone = null;
let animationId = null;

// Personality prompts
const PERSONALITY_PROMPTS = {
  helpful: "You are a helpful and friendly AI assistant. Provide clear, accurate, and useful responses.",
  creative: "You are a creative and imaginative AI assistant. Think outside the box and provide innovative, artistic responses.",
  technical: "You are a technical expert AI assistant. Provide detailed, accurate technical information with examples and best practices.",
  casual: "You are a casual, friendly AI assistant. Respond in a relaxed, conversational tone like talking to a good friend.",
  professional: "You are a professional AI assistant. Provide formal, well-structured responses suitable for business contexts."
};

// Browser Compatibility Check
function checkBrowserCompatibility() {
  const issues = [];
  
  // Check Speech Recognition
  if (!SpeechRecognition) {
    issues.push('Speech Recognition not supported');
  }
  
  // Check Speech Synthesis
  if (!window.speechSynthesis) {
    issues.push('Speech Synthesis not supported');
  }
  
  // Check Media Devices
  if (!navigator.mediaDevices) {
    issues.push('Media Devices API not supported');
  }
  
  // Check WebSocket support
  if (!window.WebSocket) {
    issues.push('WebSocket not supported');
  }
  
  if (issues.length > 0) {
    const message = `Browser compatibility issues detected:\n• ${issues.join('\n• ')}\n\nFor best experience, please use Chrome, Edge, or Safari.`;
    console.warn('⚠️ Browser compatibility issues:', issues);
    showError(message);
    return false;
  }
  
  console.log('✅ Browser compatibility check passed');
  return true;
}

// Initialize Application
function initializeApp() {
  console.log('🚀 Initializing English Tutor AI...');
  
  // Check browser compatibility first
  const isCompatible = checkBrowserCompatibility();
  
  // Apply saved theme
  applyTheme(AppState.currentTheme);
  
  // Initialize speech recognition
  initializeSpeechRecognition();
  
  // Load available voices
  loadAvailableVoices();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load conversation history
  loadConversationHistory();
  
  // Apply saved settings
  applySettings();
  
  // Initialize progress display
  updateProgressDisplay();
  
  // Initialize active mode
  initializeActiveMode();
  
  // Start session timer
  setInterval(updateSessionTimer, 1000);
  
  if (isCompatible) {
    console.log('✅ English Tutor AI initialized successfully');
    showToast('Welcome to English Tutor AI! 🎓 Choose a practice mode to begin.', 'success');
  } else {
    console.log('⚠️ English Tutor AI initialized with compatibility warnings');
  }
}

// Enhanced Speech Recognition with better microphone handling
function initializeSpeechRecognition() {
  if (!SpeechRecognition) {
    showError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    elements.micBtn.disabled = true;
    elements.micBtn.style.opacity = '0.5';
    return;
  }
  
  try {
    recognition = new SpeechRecognition();
    recognition.lang = AppState.settings.language;
    recognition.interimResults = true; // Enable interim results for better UX
    recognition.maxAlternatives = 3; // Get multiple alternatives
    recognition.continuous = false;
    
    // Enhanced browser-specific settings
    if (typeof recognition.serviceURI !== 'undefined') {
      recognition.serviceURI = 'wss://api.speechmatics.com/v2';
    }
    
    // Speech Recognition Event Listeners with enhanced error handling
    recognition.addEventListener('speechstart', handleSpeechStart);
    recognition.addEventListener('speechend', handleSpeechEnd);
    recognition.addEventListener('result', handleSpeechResult);
    recognition.addEventListener('error', handleSpeechError);
    recognition.addEventListener('nomatch', handleNoMatch);
    recognition.addEventListener('start', handleRecognitionStart);
    recognition.addEventListener('end', handleRecognitionEnd);
    
    console.log('✅ Enhanced speech recognition initialized successfully');
    
    // Test microphone permissions on initialization
    testMicrophoneAccess();
    
  } catch (error) {
    console.error('❌ Failed to initialize speech recognition:', error);
    showError('Failed to initialize speech recognition. Please refresh the page and try again.');
    elements.micBtn.disabled = true;
    elements.micBtn.style.opacity = '0.5';
  }
}

// Test microphone access and permissions
async function testMicrophoneAccess() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      showToast('🎤 Microphone ready! Click the microphone to start practicing.', 'success');
      
    } else {
      throw new Error('Media devices not supported');
    }
  } catch (error) {
    console.error('❌ Microphone access error:', error);
    handleMicrophoneError(error);
  }
}

// Handle microphone-specific errors
function handleMicrophoneError(error) {
  let errorMessage = '🎤 Microphone Error: ';
  let suggestions = [];
  
  switch (error.name) {
    case 'NotAllowedError':
      errorMessage += 'Microphone access denied.';
      suggestions = [
        'Click the microphone icon in your browser\'s address bar',
        'Select "Allow" for microphone access',
        'Refresh the page and try again'
      ];
      break;
    case 'NotFoundError':
      errorMessage += 'No microphone found.';
      suggestions = [
        'Connect a microphone to your device',
        'Check your microphone is properly connected',
        'Try using a different microphone'
      ];
      break;
    case 'NotReadableError':
      errorMessage += 'Microphone is being used by another application.';
      suggestions = [
        'Close other applications using the microphone',
        'Restart your browser',
        'Check microphone settings in system preferences'
      ];
      break;
    default:
      errorMessage += 'Unknown microphone error.';
      suggestions = [
        'Check microphone permissions in browser settings',
        'Try refreshing the page',
        'Use a different browser (Chrome recommended)'
      ];
  }
  
  showDetailedError(errorMessage, suggestions);
}

// Show detailed error with suggestions
function showDetailedError(message, suggestions = []) {
  const errorHtml = `
    <div class="error-details">
      <h4>${message}</h4>
      ${suggestions.length > 0 ? `
        <ul class="error-suggestions">
          ${suggestions.map(suggestion => `<li>💡 ${suggestion}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  
  showToast(errorHtml, 'error');
}

// Enhanced speech recognition handlers
function handleRecognitionStart() {
  console.log('🎤 Recognition started');
  AppState.isRecording = true;
}

function handleRecognitionEnd() {
  console.log('🎤 Recognition ended');
  AppState.isRecording = false;
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
}

function handleSpeechResult(event) {
  console.log('📝 Speech result received');
  
  let finalTranscript = '';
  let interimTranscript = '';
  
  // Process all results
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    const confidence = event.results[i][0].confidence;
    
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
      console.log(`Final: "${transcript}" (confidence: ${confidence})`);
    } else {
      interimTranscript += transcript;
      console.log(`Interim: "${transcript}"`);
    }
  }
  
  // Update UI with interim results
  if (interimTranscript) {
    elements.outputYou.textContent = finalTranscript + interimTranscript;
    elements.outputYou.style.opacity = '0.7';
  }
  
  // Process final result
  if (finalTranscript) {
    elements.outputYou.textContent = finalTranscript;
    elements.outputYou.style.opacity = '1';
    
    // Analyze speech and update session stats
    analyzeUserSpeech(finalTranscript);
    
    // Add to conversation history
    addToConversationHistory('user', finalTranscript);
    
    // Show loading indicator
    console.log('🔄 Showing loading indicator');
    showLoadingIndicator();
    
    // Prepare enhanced message data
    const messageData = {
      text: finalTranscript,
      model: AppState.settings.aiModel,
      personality: AppState.tutorMode,
      learningMode: AppState.learningMode,
      difficultyLevel: AppState.difficultyLevel,
      feedbackStyle: AppState.feedbackStyle,
      sessionContext: {
        messagesCount: AppState.currentSession.messagesCount,
        wordsSpoken: AppState.currentSession.wordsSpoken,
        currentScores: AppState.scores,
        scenario: AppState.selectedScenario,
        scenarioContext: AppState.scenarioContext
      }
    };
    
    console.log('📤 Sending enhanced message to server:', messageData);
    
    // Send to server with comprehensive context
    socket.emit('chat message', messageData);
    
    // Update session statistics
    AppState.currentSession.messagesCount++;
    AppState.currentSession.wordsSpoken += finalTranscript.split(' ').length;
  }
}

// Analyze user speech for comprehensive scoring
function analyzeUserSpeech(text) {
  const words = text.split(' ');
  const wordCount = words.length;
  
  // Update session stats
  AppState.currentSession.interactions.push({
    timestamp: new Date().toISOString(),
    text: text,
    wordCount: wordCount,
    analysis: {
      complexity: calculateComplexity(text),
      vocabularyLevel: assessVocabulary(text),
      grammarScore: estimateGrammar(text),
      fluencyIndicators: assessFluency(text)
    }
  });
  
  // Add words to vocabulary set
  words.forEach(word => {
    if (word.length > 3) {
      AppState.currentSession.vocabularyUsed.add(word.toLowerCase());
    }
  });
  
  console.log('📊 Speech analyzed:', {
    wordCount,
    totalWords: AppState.currentSession.wordsSpoken,
    vocabularyUsed: AppState.currentSession.vocabularyUsed.size
  });
}

// Calculate text complexity
function calculateComplexity(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(' ');
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const longWords = words.filter(word => word.length > 6).length;
  
  return {
    avgWordsPerSentence,
    longWordRatio: longWords / words.length,
    sentenceCount: sentences.length,
    complexity: Math.min(100, (avgWordsPerSentence * 2) + (longWords * 5))
  };
}

// Assess vocabulary level
function assessVocabulary(text) {
  const words = text.toLowerCase().split(' ');
  const uniqueWords = new Set(words);
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const advancedWords = words.filter(word => word.length > 6 && !commonWords.includes(word));
  
  return {
    uniqueWordRatio: uniqueWords.size / words.length,
    advancedWordCount: advancedWords.length,
    vocabularyRichness: Math.min(100, (uniqueWords.size * 10) + (advancedWords.length * 15))
  };
}

// Estimate grammar quality
function estimateGrammar(text) {
  // Basic grammar indicators
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const hasProperCapitalization = /^[A-Z]/.test(text.trim());
  const hasProperPunctuation = /[.!?]$/.test(text.trim());
  const hasVariedSentenceStructure = sentences.some(s => s.includes(','));
  
  let score = 50; // Base score
  if (hasProperCapitalization) score += 15;
  if (hasProperPunctuation) score += 15;
  if (hasVariedSentenceStructure) score += 20;
  
  return Math.min(100, score);
}

// Assess fluency indicators
function assessFluency(text) {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically'];
  const words = text.toLowerCase().split(' ');
  const fillerCount = words.filter(word => fillerWords.includes(word)).length;
  const fluencyScore = Math.max(0, 100 - (fillerCount * 10));
  
  return {
    fillerWordCount: fillerCount,
    fluencyScore,
    wordFlow: words.length > 10 ? 'good' : 'short'
  };
}

// Enhanced recording control with better error handling
function toggleRecording() {
  if (!recognition) {
    showError('Speech recognition not available. Please refresh the page.');
    return;
  }
  
  if (AppState.isRecording) {
    try {
      recognition.stop();
      console.log('🛑 Stopping speech recognition...');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      AppState.isRecording = false;
      elements.micBtn.classList.remove('recording');
    }
  } else {
    startRecording();
  }
}

// Enhanced recording start with comprehensive checks
async function startRecording() {
  try {
    console.log('🎤 Attempting to start recording...');
    
    // Check if recognition is available
    if (!recognition) {
      throw new Error('Speech recognition not initialized');
    }
    
    // Check microphone permissions first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log('🔍 Testing microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      // Stop the permission test stream
      stream.getTracks().forEach(track => track.stop());
      
      // Update UI to show recording state
      elements.micBtn.classList.add('recording');
      AppState.isRecording = true;
      
      // Start voice visualization
      startVoiceVisualization();
      
      // Start speech recognition
      recognition.start();
      console.log('🎤 Speech recognition started successfully');
      
      // Initialize session if needed
      if (!AppState.currentSession.startTime) {
        AppState.currentSession.startTime = new Date();
        AppState.sessionStartTime = Date.now();
        console.log('📊 Session started');
      }
      
      // Show status feedback
      showToast('🎤 Listening... Speak now!', 'info');
      
    } else {
      throw new Error('Media devices not supported in this browser');
    }
  } catch (error) {
    console.error('❌ Failed to start recording:', error);
    AppState.isRecording = false;
    elements.micBtn.classList.remove('recording');
    handleMicrophoneError(error);
  }
}

// Voice Loading
function loadAvailableVoices() {
  const updateVoices = () => {
    availableVoices = speechSynthesis.getVoices();
    populateVoiceSelect();
  };
  
  updateVoices();
  speechSynthesis.addEventListener('voiceschanged', updateVoices);
}

function populateVoiceSelect() {
  elements.voiceSelect.innerHTML = '<option value="">Default</option>';
  
  availableVoices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.name === AppState.settings.selectedVoice) {
      option.selected = true;
    }
    elements.voiceSelect.appendChild(option);
  });
}

// Enhanced Event Listeners Setup
function setupEventListeners() {
  // Microphone button
  if (elements.micBtn) elements.micBtn.addEventListener('click', toggleRecording);
  
  // Control buttons
  if (elements.themeBtn) elements.themeBtn.addEventListener('click', toggleTheme);
  if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', toggleSettings);
  if (elements.muteBtn) elements.muteBtn.addEventListener('click', toggleMute);
  if (elements.stopBtn) elements.stopBtn.addEventListener('click', stopCurrentSpeech);
  if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', closeSettings);
  if (elements.clearHistoryBtn) elements.clearHistoryBtn.addEventListener('click', clearConversationHistory);
  
  // Settings
  if (elements.tutorModeSelect) elements.tutorModeSelect.addEventListener('change', updatePersonality);
  if (elements.difficultyLevelSelect) elements.difficultyLevelSelect.addEventListener('change', updateDifficultyLevel);
  if (elements.feedbackStyleSelect) elements.feedbackStyleSelect.addEventListener('change', updateFeedbackStyle);
  if (elements.languageSelect) elements.languageSelect.addEventListener('change', updateLanguage);
  if (elements.voiceSelect) elements.voiceSelect.addEventListener('change', updateSelectedVoice);
  if (elements.sessionLengthSelect) elements.sessionLengthSelect.addEventListener('change', updateSessionLength);
  
  // Learning Mode Cards
  setupModeCardListeners();
  
  // Dashboard Toggle
  setupDashboardToggle();
  
  // Feedback Panel Toggle
  setupFeedbackToggle();
  
  // Socket events
  socket.on('connect', handleSocketConnect);
  socket.on('disconnect', handleSocketDisconnect);
  socket.on('tutor response', handleTutorResponse);
  socket.on('bot reply', handleBotReply); // Keep for backward compatibility
  socket.on('error', handleSocketError);
  
  // Add debugging for all socket events
  socket.onAny((event, ...args) => {
    console.log('🔌 Socket event received:', event, args);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Click outside settings to close
  document.addEventListener('click', handleOutsideClick);
  
  // Add smooth scroll behavior
  document.documentElement.style.scrollBehavior = 'smooth';
  
  // Initialize animations
  initializeAnimations();
}

// Setup Mode Card Interactions
function setupModeCardListeners() {
  const modeCards = document.querySelectorAll('.mode-card');
  
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all cards
      modeCards.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked card
      card.classList.add('active');
      
      // Update learning mode
      const mode = card.getAttribute('data-mode');
      if (mode) {
        AppState.learningMode = mode;
        localStorage.setItem('learningMode', mode);
        
        // Update tutor mode based on learning mode
        updateTutorModeFromLearningMode(mode);
        
        // Show toast notification
        const modeName = card.querySelector('h4').textContent;
        showToast(`Switched to ${modeName} mode`, 'success');
        
        // Add bounce animation
        card.style.animation = 'none';
        setTimeout(() => {
          card.style.animation = 'bounce 0.6s ease';
        }, 10);
      }
      
      // Handle scenario mode specially
      if (mode === 'scenario') {
        openScenarioModal();
      }
    });
    
    // Add hover sound effect (optional)
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('active')) {
        card.style.transform = '';
      }
    });
  });
}

// Update tutor mode based on learning mode
function updateTutorModeFromLearningMode(learningMode) {
  const modeMapping = {
    'conversation': 'conversation_partner',
    'grammar': 'grammar_tutor',
    'pronunciation': 'pronunciation_coach',
    'vocabulary': 'vocabulary_builder',
    'fluency': 'fluency_coach',
    'scenario': 'conversation_partner'
  };
  
  const tutorMode = modeMapping[learningMode] || 'conversation_partner';
  AppState.tutorMode = tutorMode;
  localStorage.setItem('tutorMode', tutorMode);
  
  // Update the select element if it exists
  if (elements.tutorModeSelect) {
    elements.tutorModeSelect.value = tutorMode;
  }
}

// Setup Dashboard Toggle
function setupDashboardToggle() {
  const toggleBtn = document.getElementById('toggle-dashboard');
  const dashboardContent = document.querySelector('.dashboard-content');
  
  if (toggleBtn && dashboardContent) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = dashboardContent.style.display !== 'none';
      
      if (isOpen) {
        dashboardContent.style.display = 'none';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-down';
        toggleBtn.setAttribute('aria-label', 'Expand dashboard');
      } else {
        dashboardContent.style.display = 'block';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-up';
        toggleBtn.setAttribute('aria-label', 'Collapse dashboard');
        
        // Animate progress bars
        animateProgressBars();
      }
      
      // Add rotation animation to button
      toggleBtn.style.transform = 'scale(1.1) rotate(180deg)';
      setTimeout(() => {
        toggleBtn.style.transform = '';
      }, 300);
    });
  }
}

// Setup Feedback Panel Toggle
function setupFeedbackToggle() {
  const toggleBtn = document.getElementById('toggle-feedback');
  const feedbackContent = document.querySelector('.feedback-content');
  
  if (toggleBtn && feedbackContent) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = feedbackContent.style.display !== 'none';
      
      if (isOpen) {
        feedbackContent.style.display = 'none';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-down';
      } else {
        feedbackContent.style.display = 'block';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-up';
      }
      
      // Add rotation animation
      toggleBtn.style.transform = 'scale(1.1) rotate(180deg)';
      setTimeout(() => {
        toggleBtn.style.transform = '';
      }, 300);
    });
  }
}

// Animate Progress Bars
function animateProgressBars() {
  const progressBars = document.querySelectorAll('.progress-fill');
  
  progressBars.forEach((bar, index) => {
    const targetWidth = bar.style.width;
    bar.style.width = '0%';
    
    setTimeout(() => {
      bar.style.transition = 'width 1s ease-out';
      bar.style.width = targetWidth;
    }, index * 200);
  });
}

// Initialize Animations
function initializeAnimations() {
  // Add slide-in animation to cards
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('slide-in-up');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe elements for animation
  const animatedElements = document.querySelectorAll('.mode-card, .progress-card, .stat-item');
  animatedElements.forEach(el => observer.observe(el));
  
  // Initialize progress bar animations
  setTimeout(animateProgressBars, 500);
}

// Scenario Modal Functions
function openScenarioModal() {
  const modal = document.getElementById('scenario-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.animation = 'fadeIn 0.3s ease';
    
    // Setup scenario card listeners
    const scenarioCards = modal.querySelectorAll('.scenario-card');
    scenarioCards.forEach(card => {
      card.addEventListener('click', () => {
        const scenario = card.getAttribute('data-scenario');
        selectScenario(scenario);
        closeScenarioModal();
      });
    });
  }
}

function closeScenarioModal() {
  const modal = document.getElementById('scenario-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

function selectScenario(scenario) {
  AppState.selectedScenario = scenario;
  localStorage.setItem('selectedScenario', scenario);
  
  const scenarioNames = {
    'job-interview': 'Job Interview',
    'restaurant': 'Restaurant',
    'travel': 'Travel',
    'shopping': 'Shopping',
    'medical': 'Medical',
    'social': 'Social'
  };
  
  const scenarioName = scenarioNames[scenario] || scenario;
  showToast(`Selected ${scenarioName} scenario`, 'success');
  
  // Update the conversation prompt for the scenario
  AppState.scenarioContext = getScenarioContext(scenario);
}

function getScenarioContext(scenario) {
  const contexts = {
    'job-interview': 'You are practicing for a job interview. Ask relevant questions about experience, skills, and career goals.',
    'restaurant': 'You are at a restaurant. Practice ordering food, asking about menu items, and dining conversations.',
    'travel': 'You are traveling. Practice airport, hotel, and tourist interactions.',
    'shopping': 'You are shopping. Practice asking about products, prices, and making purchases.',
    'medical': 'You are at a doctor\'s office. Practice describing symptoms and health concerns.',
    'social': 'You are in a social setting. Practice casual conversations and small talk.'
  };
  
  return contexts[scenario] || 'Practice general conversation.';
}

// Enhanced Progress Display
function updateProgressDisplay() {
  // Update progress scores
  const grammarScore = document.getElementById('grammar-score');
  const pronunciationScore = document.getElementById('pronunciation-score');
  const vocabularyScore = document.getElementById('vocabulary-score');
  const fluencyScore = document.getElementById('fluency-score');
  
  if (grammarScore) grammarScore.textContent = `${AppState.scores.grammar}%`;
  if (pronunciationScore) pronunciationScore.textContent = `${AppState.scores.pronunciation}%`;
  if (vocabularyScore) vocabularyScore.textContent = `${AppState.scores.vocabulary}%`;
  if (fluencyScore) fluencyScore.textContent = `${AppState.scores.fluency}%`;
  
  // Update progress bars
  const progressBars = document.querySelectorAll('.progress-fill');
  progressBars.forEach((bar, index) => {
    const scores = [AppState.scores.grammar, AppState.scores.pronunciation, AppState.scores.vocabulary, AppState.scores.fluency];
    if (scores[index]) {
      bar.style.width = `${scores[index]}%`;
    }
  });
  
  // Update session timer
  updateSessionTimer();
}

// Session Timer
function updateSessionTimer() {
  if (!AppState.sessionStartTime) {
    AppState.sessionStartTime = Date.now();
  }
  
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const elapsed = Date.now() - AppState.sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Enhanced Theme Toggle with Animation
function toggleTheme() {
  const currentTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
  AppState.currentTheme = currentTheme;
  localStorage.setItem('theme', currentTheme);
  
  // Add transition class
  document.body.classList.add('theme-transitioning');
  
  applyTheme(currentTheme);
  
  // Remove transition class after animation
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 300);
  
  // Update theme button icon with animation
  const themeBtn = document.getElementById('theme-btn');
  const icon = themeBtn.querySelector('i');
  
  themeBtn.style.transform = 'scale(0.8) rotate(180deg)';
  
  setTimeout(() => {
    icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    themeBtn.style.transform = 'scale(1) rotate(0deg)';
  }, 150);
  
  showToast(`Switched to ${currentTheme} theme`, 'info');
}

// Enhanced Settings Panel with Animations
function toggleSettings() {
  const panel = elements.settingsPanel;
  const isOpen = panel.classList.contains('open');
  
  if (isOpen) {
    closeSettings();
  } else {
    panel.classList.add('open');
    
    // Animate settings groups
    const settingGroups = panel.querySelectorAll('.setting-group');
    settingGroups.forEach((group, index) => {
      group.style.opacity = '0';
      group.style.transform = 'translateX(20px)';
      
      setTimeout(() => {
        group.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        group.style.opacity = '1';
        group.style.transform = 'translateX(0)';
      }, index * 100);
    });
  }
}

function closeSettings() {
  elements.settingsPanel.classList.remove('open');
  
  // Reset setting group animations
  const settingGroups = elements.settingsPanel.querySelectorAll('.setting-group');
  settingGroups.forEach(group => {
    group.style.transition = '';
    group.style.opacity = '';
    group.style.transform = '';
  });
}

// Add CSS for smooth theme transitions
const themeTransitionCSS = `
.theme-transitioning * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

@keyframes bounce {
  0%, 20%, 60%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  80% { transform: translateY(-5px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.9); }
}
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = themeTransitionCSS;
document.head.appendChild(styleSheet);

// Initialize active mode on page load
function initializeActiveMode() {
  const savedMode = AppState.learningMode;
  const modeCards = document.querySelectorAll('.mode-card');
  
  modeCards.forEach(card => {
    const cardMode = card.getAttribute('data-mode');
    if (cardMode === savedMode) {
      card.classList.add('active');
    }
  });
}

// Speech Recognition Handlers
function handleSpeechStart() {
  console.log('🎤 Speech detection started');
  elements.micBtn.classList.add('recording');
  startVoiceVisualization();
}

function handleSpeechEnd() {
  console.log('🔇 Speech detection ended');
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
  AppState.isRecording = false;
}

function handleSpeechError(event) {
  console.error('❌ Speech recognition error:', event.error);
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
  AppState.isRecording = false;
  
  let errorMessage = 'Speech recognition error: ';
  switch (event.error) {
    case 'no-speech':
      errorMessage += 'No speech detected. Please try again.';
      break;
    case 'audio-capture':
      errorMessage += 'Microphone not accessible. Please check permissions.';
      break;
    case 'not-allowed':
      errorMessage += 'Microphone access denied. Please allow microphone access.';
      break;
    case 'network':
      errorMessage += 'Network error. Please check your connection.';
      break;
    default:
      errorMessage += event.error;
  }
  
  showError(errorMessage);
  elements.outputBot.textContent = errorMessage;
}

function handleNoMatch() {
  console.log('❓ No speech match found');
  showError('Could not understand speech. Please try again.');
}

// Voice Visualization
function startVoiceVisualization() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return;
  }
  
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      elements.voiceVisualizer.classList.add('show');
      drawVisualization();
    })
    .catch(error => {
      console.error('Error accessing microphone for visualization:', error);
    });
}

function stopVoiceVisualization() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  elements.voiceVisualizer.classList.remove('show');
}

function drawVisualization() {
  if (!analyser) return;
  
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteFrequencyData(dataArray);
    
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#39C2C9');
    gradient.addColorStop(1, '#3FC8C9');
    
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
  
  draw();
}

// Enhanced Tutor Response Handling
function handleTutorResponse(data) {
  console.log('🎓 Enhanced tutor response received:', data);
  
  hideLoadingIndicator();
  
  if (data.error) {
    showError(data.reply || 'An error occurred. Please try again.');
    return;
  }
  
  const reply = data.reply;
  const speechAnalysis = data.speechAnalysis;
  const learningFeedback = data.learningFeedback;
  const metadata = data.metadata;
  
  // Update UI with response
  console.log('📝 Setting output bot text to:', reply);
  elements.outputBot.textContent = reply;
  
  // Process comprehensive learning analytics
  if (speechAnalysis) {
    console.log('📊 Processing speech analysis:', speechAnalysis);
    updateComprehensiveScores(speechAnalysis);
  }
  
  // Display enhanced learning feedback
  if (learningFeedback) {
    console.log('💡 Displaying enhanced feedback:', learningFeedback);
    displayEnhancedFeedback(learningFeedback);
  }
  
  // Update session metadata
  if (metadata) {
    updateSessionMetadata(metadata);
  }
  
  // Add to conversation history with metadata
  addToConversationHistory('tutor', reply, {
    speechAnalysis,
    learningFeedback,
    timestamp: new Date().toISOString()
  });
  
  // Speak the response
  if (!AppState.isMuted) {
    console.log('🔊 Speaking enhanced response:', reply.substring(0, 50) + '...');
    speakText(reply);
  }
  
  // Generate session report if this is a significant interaction
  if (AppState.currentSession.messagesCount > 0 && AppState.currentSession.messagesCount % 5 === 0) {
    generateSessionReport();
  }
}

// Bot Response Handling (Backward Compatibility)
function handleBotReply(replyText) {
  console.log('🤖 Bot reply received:', replyText);
  
  // Hide loading indicator
  hideLoadingIndicator();
  
  if (!replyText || replyText.trim() === '') {
    replyText = 'I apologize, but I couldn\'t generate a response. Please try again.';
  }
  
  elements.outputBot.textContent = replyText;
  
  // Add to conversation history
  addToConversationHistory('bot', replyText);
  
  // Speak the response if not muted
  if (!AppState.isMuted) {
    speakText(replyText);
  }
}

// Text-to-Speech
function speakText(text) {
  if (!speechSynthesis) {
    console.error('Speech synthesis not supported');
    return;
  }
  
  // Stop any ongoing speech
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply selected voice
  if (AppState.settings.selectedVoice) {
    const selectedVoice = availableVoices.find(voice => 
      voice.name === AppState.settings.selectedVoice
    );
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }
  
  // Set language based on current setting
  utterance.lang = AppState.settings.language;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  utterance.onstart = () => {
    elements.stopBtn.classList.add('active');
  };
  
  utterance.onend = () => {
    elements.stopBtn.classList.remove('active');
  };
  
  utterance.onerror = (error) => {
    console.error('Speech synthesis error:', error);
    elements.stopBtn.classList.remove('active');
  };
  
  speechSynthesis.speak(utterance);
}

function stopCurrentSpeech() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    elements.stopBtn.classList.remove('active');
  }
}

// Learning Progress Functions
function updateLearningProgress(speechAnalysis) {
  try {
    // Update session stats
    AppState.currentSession.messagesCount++;
    AppState.currentSession.wordsSpoken += speechAnalysis.wordCount || 0;
    
    // Update grammar score based on issues found
    if (speechAnalysis.grammarIssues && speechAnalysis.grammarIssues.length > 0) {
      AppState.currentSession.grammarErrors += speechAnalysis.grammarIssues.length;
      // Slightly decrease grammar score if issues found
      AppState.scores.grammar = Math.max(50, AppState.scores.grammar - 1);
    } else if (speechAnalysis.wordCount > 5) {
      // Improve grammar score for longer error-free sentences
      AppState.scores.grammar = Math.min(100, AppState.scores.grammar + 0.5);
    }
    
    // Update fluency score
    if (speechAnalysis.fluencyScore) {
      AppState.scores.fluency = Math.round((AppState.scores.fluency + speechAnalysis.fluencyScore) / 2);
    }
    
    // Update vocabulary tracking
    if (speechAnalysis.vocabularyLevel) {
      const levelScores = { 'beginner': 70, 'intermediate': 85, 'advanced': 95 };
      const targetScore = levelScores[speechAnalysis.vocabularyLevel] || 80;
      AppState.scores.vocabulary = Math.round((AppState.scores.vocabulary + targetScore) / 2);
    }
    
    // Save progress to localStorage
    localStorage.setItem('grammarScore', AppState.scores.grammar);
    localStorage.setItem('pronunciationScore', AppState.scores.pronunciation);
    localStorage.setItem('vocabularyScore', AppState.scores.vocabulary);
    localStorage.setItem('fluencyScore', AppState.scores.fluency);
    
    // Update progress display
    updateProgressDisplay();
    
  } catch (error) {
    console.error('Error updating learning progress:', error);
  }
}

function displayLearningFeedback(learningFeedback) {
  try {
    // This function can be enhanced to show specific feedback in the UI
    // For now, we'll log it and could add UI elements later
    console.log('Learning feedback:', learningFeedback);
    
    // Could add visual feedback indicators here
    if (learningFeedback.grammar && learningFeedback.grammar.length > 0) {
      console.log('Grammar feedback available');
    }
    
    if (learningFeedback.pronunciation && learningFeedback.pronunciation.length > 0) {
      console.log('Pronunciation feedback available');
    }
    
    if (learningFeedback.vocabulary && learningFeedback.vocabulary.length > 0) {
      console.log('Vocabulary feedback available');
    }
    
  } catch (error) {
    console.error('Error displaying learning feedback:', error);
  }
}

// Conversation History Management
function addToConversationHistory(sender, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const historyItem = {
    id: Date.now(),
    sender,
    message,
    metadata,
    timestamp
  };
  
  AppState.conversationHistory.unshift(historyItem);
  
  // Limit history size
  if (AppState.conversationHistory.length > CONFIG.maxHistoryItems) {
    AppState.conversationHistory = AppState.conversationHistory.slice(0, CONFIG.maxHistoryItems);
  }
  
  // Save to localStorage
  localStorage.setItem('conversationHistory', JSON.stringify(AppState.conversationHistory));
  
  // Update UI
  updateConversationHistoryUI();
}

function loadConversationHistory() {
  updateConversationHistoryUI();
}

function updateConversationHistoryUI() {
  const historyContainer = elements.chatHistory;
  
  // Clear existing history (except welcome message)
  const welcomeMessage = historyContainer.querySelector('.welcome-message');
  historyContainer.innerHTML = '';
  if (welcomeMessage) {
    historyContainer.appendChild(welcomeMessage);
  }
  
  // Add conversation items
  AppState.conversationHistory.forEach(item => {
    const messageElement = createMessageElement(item);
    historyContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function createMessageElement(item) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${item.sender}-message`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = item.sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.innerHTML = `<p>${item.message}</p>`;
  
  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTimestamp(item.timestamp);
  
  content.appendChild(time);
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  return messageDiv;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clearConversationHistory() {
  if (confirm('Are you sure you want to clear the conversation history?')) {
    AppState.conversationHistory = [];
    localStorage.removeItem('conversationHistory');
    updateConversationHistoryUI();
    showToast('Conversation history cleared', 'success');
  }
}

// Theme Management
function applyTheme(theme) {
  AppState.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update theme button icon
  const icon = elements.themeBtn.querySelector('i');
  icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Settings Management
function applySettings() {
  // Apply settings to form elements safely
  if (elements.tutorModeSelect) {
    elements.tutorModeSelect.value = AppState.tutorMode;
  }
  
  if (elements.difficultyLevelSelect) {
    elements.difficultyLevelSelect.value = AppState.difficultyLevel;
  }
  
  if (elements.feedbackStyleSelect) {
    elements.feedbackStyleSelect.value = AppState.feedbackStyle;
  }
  
  if (elements.languageSelect) {
    elements.languageSelect.value = AppState.settings.language;
  }
  
  if (elements.voiceSelect) {
    elements.voiceSelect.value = AppState.settings.selectedVoice;
  }
  
  if (elements.sessionLengthSelect) {
    elements.sessionLengthSelect.value = AppState.sessionLength;
  }
}

function updateAIModel() {
  // Note: AI model selection not implemented in current UI
  // AppState.settings.aiModel = elements.aiModelSelect.value;
  // localStorage.setItem('aiModel', AppState.settings.aiModel);
  // showToast(`AI Model changed to ${AppState.settings.aiModel}`, 'success');
  console.log('AI Model selection not available in current UI');
}

function updateLanguage() {
  AppState.settings.language = elements.languageSelect.value;
  localStorage.setItem('language', AppState.settings.language);
  
  if (recognition) {
    recognition.lang = AppState.settings.language;
  }
  
  showToast(`Language changed to ${AppState.settings.language}`, 'success');
}

function updatePersonality() {
  if (elements.tutorModeSelect) {
    AppState.tutorMode = elements.tutorModeSelect.value;
    localStorage.setItem('tutorMode', AppState.tutorMode);
    showToast(`Tutor mode changed to ${AppState.tutorMode.replace('_', ' ')}`, 'success');
  }
}

function updateSelectedVoice() {
  AppState.settings.selectedVoice = elements.voiceSelect.value;
  localStorage.setItem('selectedVoice', AppState.settings.selectedVoice);
  showToast('Voice selection updated', 'success');
}

// Audio Controls
function toggleMute() {
  AppState.isMuted = !AppState.isMuted;
  elements.muteBtn.classList.toggle('active', AppState.isMuted);
  
  const icon = elements.muteBtn.querySelector('i');
  icon.className = AppState.isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
  
  if (AppState.isMuted) {
    stopCurrentSpeech();
    showToast('Audio muted', 'info');
  } else {
    showToast('Audio unmuted', 'info');
  }
}

// Socket Event Handlers
function handleSocketConnect() {
  console.log('✅ Connected to server');
  elements.connectionStatus.className = 'status-dot connected';
  elements.statusText.textContent = 'Connected';
}

function handleSocketDisconnect() {
  console.log('❌ Disconnected from server');
  elements.connectionStatus.className = 'status-dot disconnected';
  elements.statusText.textContent = 'Disconnected';
  hideLoadingIndicator();
}

function handleSocketError(error) {
  console.error('Socket error:', error);
  showError('Connection error occurred');
  hideLoadingIndicator();
}

// UI State Management
let loadingTimeout = null;

function showLoadingIndicator() {
  elements.loadingIndicator.classList.add('show');
  
  // Clear any existing timeout
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  
  // Auto-hide after 10 seconds to prevent getting stuck
  loadingTimeout = setTimeout(() => {
    console.log('⏰ Loading indicator timeout - hiding automatically');
    hideLoadingIndicator();
    showError('Request timed out. Please try again.');
  }, 10000);
}

function hideLoadingIndicator() {
  elements.loadingIndicator.classList.remove('show');
  
  // Clear the timeout
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}

// Error Handling and Notifications
function showError(message) {
  showToast(message, 'error');
}

function showToast(message, type = 'info') {
  elements.toastMessage.textContent = message;
  elements.errorToast.className = `toast ${type}`;
  elements.errorToast.classList.add('show');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideToast();
  }, 5000);
}

function hideToast() {
  elements.errorToast.classList.remove('show');
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(event) {
  // Space bar to toggle recording (when not in input)
  if (event.code === 'Space' && !event.target.matches('input, textarea, select')) {
    event.preventDefault();
    toggleRecording();
  }
  
  // Escape to close settings
  if (event.code === 'Escape') {
    closeSettings();
    hideToast();
  }
  
  // Ctrl/Cmd + M to toggle mute
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyM') {
    event.preventDefault();
    toggleMute();
  }
  
  // Ctrl/Cmd + T to toggle theme
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyT') {
    event.preventDefault();
    toggleTheme();
  }
}

// Click Outside Handler
function handleOutsideClick(event) {
  if (!elements.settingsPanel.contains(event.target) && 
      !elements.settingsBtn.contains(event.target)) {
    closeSettings();
  }
}

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showError('An unexpected error occurred');
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for global access
window.VoiceGPT = {
  toggleRecording,
  toggleTheme,
  clearHistory: clearConversationHistory,
  hideToast
};

function updateDifficultyLevel() {
  if (elements.difficultyLevelSelect) {
    AppState.difficultyLevel = elements.difficultyLevelSelect.value;
    localStorage.setItem('difficultyLevel', AppState.difficultyLevel);
    showToast(`Difficulty level changed to ${AppState.difficultyLevel}`, 'success');
  }
}

function updateFeedbackStyle() {
  if (elements.feedbackStyleSelect) {
    AppState.feedbackStyle = elements.feedbackStyleSelect.value;
    localStorage.setItem('feedbackStyle', AppState.feedbackStyle);
    showToast(`Feedback style changed to ${AppState.feedbackStyle}`, 'success');
  }
}

function updateSessionLength() {
  if (elements.sessionLengthSelect) {
    AppState.sessionLength = elements.sessionLengthSelect.value;
    localStorage.setItem('sessionLength', AppState.sessionLength);
    showToast(`Session length changed to ${AppState.sessionLength}`, 'success');
  }
}

// Update comprehensive scoring system
function updateComprehensiveScores(speechAnalysis) {
  if (!speechAnalysis) return;
  
  const {
    grammarScore = 0,
    pronunciationScore = 0,
    vocabularyScore = 0,
    fluencyScore = 0,
    overallScore = 0
  } = speechAnalysis;
  
  // Apply weighted updates (new score influences 30%, existing 70%)
  const updateWeight = 0.3;
  
  AppState.scores.grammar = Math.round(
    (AppState.scores.grammar * (1 - updateWeight)) + (grammarScore * updateWeight)
  );
  AppState.scores.pronunciation = Math.round(
    (AppState.scores.pronunciation * (1 - updateWeight)) + (pronunciationScore * updateWeight)
  );
  AppState.scores.vocabulary = Math.round(
    (AppState.scores.vocabulary * (1 - updateWeight)) + (vocabularyScore * updateWeight)
  );
  AppState.scores.fluency = Math.round(
    (AppState.scores.fluency * (1 - updateWeight)) + (fluencyScore * updateWeight)
  );
  
  // Calculate overall score
  AppState.scores.overall = Math.round(
    (AppState.scores.grammar + AppState.scores.pronunciation + 
     AppState.scores.vocabulary + AppState.scores.fluency) / 4
  );
  
  // Save to localStorage
  localStorage.setItem('grammarScore', AppState.scores.grammar);
  localStorage.setItem('pronunciationScore', AppState.scores.pronunciation);
  localStorage.setItem('vocabularyScore', AppState.scores.vocabulary);
  localStorage.setItem('fluencyScore', AppState.scores.fluency);
  localStorage.setItem('overallScore', AppState.scores.overall);
  
  // Update UI
  updateProgressDisplay();
  
  console.log('📈 Scores updated:', AppState.scores);
}

// Display enhanced learning feedback
function displayEnhancedFeedback(learningFeedback) {
  const feedbackContainer = document.getElementById('feedback-content');
  if (!feedbackContainer || !learningFeedback) return;
  
  const {
    grammarFeedback = '',
    pronunciationFeedback = '',
    vocabularyFeedback = '',
    fluencyFeedback = '',
    overallFeedback = '',
    suggestions = []
  } = learningFeedback;
  
  const feedbackHtml = `
    <div class="feedback-section">
      <h4>📚 Learning Feedback</h4>
      
      ${grammarFeedback ? `
        <div class="feedback-item grammar">
          <h5><i class="fas fa-grammar"></i> Grammar</h5>
          <p>${grammarFeedback}</p>
        </div>
      ` : ''}
      
      ${pronunciationFeedback ? `
        <div class="feedback-item pronunciation">
          <h5><i class="fas fa-microphone"></i> Pronunciation</h5>
          <p>${pronunciationFeedback}</p>
        </div>
      ` : ''}
      
      ${vocabularyFeedback ? `
        <div class="feedback-item vocabulary">
          <h5><i class="fas fa-book"></i> Vocabulary</h5>
          <p>${vocabularyFeedback}</p>
        </div>
      ` : ''}
      
      ${fluencyFeedback ? `
        <div class="feedback-item fluency">
          <h5><i class="fas fa-comments"></i> Fluency</h5>
          <p>${fluencyFeedback}</p>
        </div>
      ` : ''}
      
      ${overallFeedback ? `
        <div class="feedback-item overall">
          <h5><i class="fas fa-star"></i> Overall</h5>
          <p>${overallFeedback}</p>
        </div>
      ` : ''}
      
      ${suggestions.length > 0 ? `
        <div class="feedback-item suggestions">
          <h5><i class="fas fa-lightbulb"></i> Suggestions</h5>
          <ul>
            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  feedbackContainer.innerHTML = feedbackHtml;
  
  // Show feedback panel if hidden
  const feedbackPanel = document.getElementById('feedback-panel');
  if (feedbackPanel) {
    feedbackPanel.style.display = 'block';
  }
}

// Update session metadata
function updateSessionMetadata(metadata) {
  if (!metadata) return;
  
  const {
    sessionDuration = 0,
    wordsPerMinute = 0,
    confidenceLevel = 0,
    interactionQuality = 'good'
  } = metadata;
  
  // Update session stats
  AppState.sessionDuration = sessionDuration;
  
  // Update analytics
  AppState.analytics.totalMinutes += Math.round(sessionDuration / 60000);
  localStorage.setItem('totalMinutes', AppState.analytics.totalMinutes);
  
  console.log('📊 Session metadata updated:', metadata);
}

// Generate session report
function generateSessionReport() {
  const sessionDuration = Date.now() - AppState.sessionStartTime;
  const wordsSpoken = AppState.currentSession.wordsSpoken;
  const messagesCount = AppState.currentSession.messagesCount;
  const vocabularyUsed = AppState.currentSession.vocabularyUsed.size;
  
  const report = {
    duration: sessionDuration,
    wordsSpoken,
    messagesCount,
    vocabularyUsed,
    averageWordsPerMessage: Math.round(wordsSpoken / Math.max(messagesCount, 1)),
    wordsPerMinute: Math.round((wordsSpoken / (sessionDuration / 60000)) || 0),
    scores: { ...AppState.scores }
  };
  
  console.log('📋 Session Report:', report);
  
  // Show session summary toast
  showToast(`Session: ${messagesCount} messages, ${wordsSpoken} words, ${vocabularyUsed} unique words`, 'info');
  
  return report;
}

// Comprehensive microphone diagnostic
async function runMicrophoneDiagnostic() {
  console.log('🔧 Running comprehensive microphone diagnostic...');
  
  const diagnostics = {
    browserSupport: false,
    mediaDevicesAPI: false,
    speechRecognition: false,
    microphoneAccess: false,
    audioContext: false,
    permissions: 'unknown',
    errors: []
  };
  
  try {
    // Check browser support
    diagnostics.browserSupport = !!(window.navigator && window.navigator.userAgent);
    
    // Check MediaDevices API
    diagnostics.mediaDevicesAPI = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Check Speech Recognition
    diagnostics.speechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    
    // Check AudioContext
    diagnostics.audioContext = !!(window.AudioContext || window.webkitAudioContext);
    
    // Test microphone access
    if (diagnostics.mediaDevicesAPI) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        diagnostics.microphoneAccess = true;
        diagnostics.permissions = 'granted';
        
        // Test audio levels
        if (diagnostics.audioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          analyser.fftSize = 256;
          microphone.connect(analyser);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
        
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        diagnostics.permissions = error.name;
        diagnostics.errors.push(`Microphone access: ${error.message}`);
      }
    }
    
  } catch (error) {
    diagnostics.errors.push(`Diagnostic error: ${error.message}`);
  }
  
  console.log('🔧 Microphone Diagnostic Results:', diagnostics);
  
  // Show diagnostic results
  showMicrophoneDiagnosticResults(diagnostics);
  
  return diagnostics;
}

// Show microphone diagnostic results
function showMicrophoneDiagnosticResults(diagnostics) {
  const issues = [];
  const fixes = [];
  
  if (!diagnostics.browserSupport) {
    issues.push('Browser not supported');
    fixes.push('Use Chrome, Edge, or Safari');
  }
  
  if (!diagnostics.mediaDevicesAPI) {
    issues.push('MediaDevices API not available');
    fixes.push('Update your browser to the latest version');
  }
  
  if (!diagnostics.speechRecognition) {
    issues.push('Speech Recognition not supported');
    fixes.push('Use Chrome, Edge, or Safari for speech recognition');
  }
  
  if (!diagnostics.microphoneAccess) {
    issues.push('Microphone access denied or unavailable');
    fixes.push('Allow microphone permissions in browser settings');
  }
  
  if (diagnostics.permissions === 'NotAllowedError') {
    fixes.push('Click the microphone icon in address bar and allow access');
  }
  
  if (diagnostics.permissions === 'NotFoundError') {
    fixes.push('Connect a microphone to your device');
  }
  
  const resultHtml = `
    <div class="diagnostic-results">
      <h4>🔧 Microphone Diagnostic Results</h4>
      
      <div class="diagnostic-status">
        <p><span class="${diagnostics.browserSupport ? 'success' : 'error'}">●</span> Browser Support: ${diagnostics.browserSupport ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.mediaDevicesAPI ? 'success' : 'error'}">●</span> Media Devices API: ${diagnostics.mediaDevicesAPI ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.speechRecognition ? 'success' : 'error'}">●</span> Speech Recognition: ${diagnostics.speechRecognition ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.microphoneAccess ? 'success' : 'error'}">●</span> Microphone Access: ${diagnostics.microphoneAccess ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.audioContext ? 'success' : 'error'}">●</span> Audio Context: ${diagnostics.audioContext ? 'OK' : 'Failed'}</p>
        <p><span class="info">●</span> Permissions: ${diagnostics.permissions}</p>
      </div>
      
      ${issues.length > 0 ? `
        <div class="diagnostic-issues">
          <h5>Issues Found:</h5>
          <ul>
            ${issues.map(issue => `<li>❌ ${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${fixes.length > 0 ? `
        <div class="diagnostic-fixes">
          <h5>Recommended Fixes:</h5>
          <ul>
            ${fixes.map(fix => `<li>💡 ${fix}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${diagnostics.errors.length > 0 ? `
        <div class="diagnostic-errors">
          <h5>Error Details:</h5>
          <ul>
            ${diagnostics.errors.map(error => `<li>⚠️ ${error}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  showToast(resultHtml, 'info');
}

// Auto-run diagnostic on microphone issues
function autoFixMicrophoneIssues() {
  console.log('🔧 Auto-fixing microphone issues...');
  
  // Reinitialize speech recognition
  if (!recognition && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    initializeSpeechRecognition();
  }
  
  // Test microphone access again
  testMicrophoneAccess();
  
  // Update UI state
  if (elements.micBtn) {
    elements.micBtn.disabled = false;
    elements.micBtn.style.opacity = '1';
  }
}

// Add diagnostic button to help users
function addMicrophoneDiagnosticButton() {
  const diagnosticBtn = document.createElement('button');
  diagnosticBtn.id = 'diagnostic-btn';
  diagnosticBtn.className = 'diagnostic-btn';
  diagnosticBtn.innerHTML = '<i class="fas fa-stethoscope"></i> Run Microphone Diagnostic';
  diagnosticBtn.onclick = runMicrophoneDiagnostic;
  
  // Add to controls area
  const controlsArea = document.querySelector('.controls');
  if (controlsArea && !document.getElementById('diagnostic-btn')) {
    controlsArea.appendChild(diagnosticBtn);
  }
}

// Initialize diagnostic features
function initializeDiagnostics() {
  addMicrophoneDiagnosticButton();
  
  // Auto-run diagnostic if microphone issues detected
  setTimeout(() => {
    if (!recognition || elements.micBtn.disabled) {
      console.log('🔧 Microphone issues detected, running auto-diagnostic...');
      runMicrophoneDiagnostic();
    }
  }, 2000);
}
