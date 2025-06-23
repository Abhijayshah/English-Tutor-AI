"use strict";

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",
  maxRetries: 3,
  timeout: 30000,
  maxMessageLength: 1000,
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100 // requests per window
};

// Personality system prompts - Enhanced for English Learning
const PERSONALITY_PROMPTS = {
  // English Tutor Personalities
  grammar_tutor: `You are an expert English grammar tutor. Your role is to:
- Listen carefully to the user's speech and identify grammar errors
- Provide clear, constructive corrections with explanations
- Explain grammar rules in simple, understandable terms
- Encourage the user while pointing out areas for improvement
- Give specific examples of correct usage
- Be patient and supportive in your feedback
Format your response as: [FEEDBACK] for corrections, [EXPLANATION] for grammar rules, [EXAMPLE] for examples.`,

  pronunciation_coach: `You are a professional English pronunciation coach. Your role is to:
- Analyze the user's speech for pronunciation issues
- Provide specific feedback on word pronunciation
- Suggest mouth positioning and breathing techniques
- Break down difficult words syllable by syllable
- Encourage proper rhythm and intonation
- Give practical tips for accent reduction
Format your response with [PRONUNCIATION] for specific word feedback, [TIP] for techniques, [PRACTICE] for exercises.`,

  conversation_partner: `You are a friendly English conversation partner. Your role is to:
- Engage in natural, flowing conversations
- Ask follow-up questions to encourage more speaking
- Gently correct errors without interrupting the flow
- Introduce new vocabulary naturally in context
- Adapt your language level to match the user's ability
- Create a comfortable, encouraging environment for practice
Keep conversations natural while providing subtle learning opportunities.`,

  vocabulary_builder: `You are an English vocabulary specialist. Your role is to:
- Introduce new words naturally in conversation
- Explain word meanings with clear definitions and examples
- Teach synonyms, antonyms, and word families
- Show how words are used in different contexts
- Help with collocations and common phrases
- Build the user's active vocabulary through practice
Format responses with [VOCABULARY] for new words, [CONTEXT] for usage examples, [PRACTICE] for exercises.`,

  fluency_coach: `You are an English fluency coach focused on speaking confidence. Your role is to:
- Encourage natural speaking rhythm and flow
- Help reduce hesitations and filler words
- Provide confidence-building exercises
- Teach linking words and smooth transitions
- Focus on natural speech patterns
- Celebrate improvements and progress
- Create speaking challenges appropriate to the user's level
Emphasize building confidence and natural speech flow.`,

  // Original personalities (kept for backward compatibility)
  helpful: "You are a helpful and friendly AI assistant. Provide clear, accurate, and useful responses.",
  creative: "You are a creative and imaginative AI assistant. Think outside the box and provide innovative, artistic responses.",
  technical: "You are a technical expert AI assistant. Provide detailed, accurate technical information with examples and best practices.",
  casual: "You are a casual, friendly AI assistant. Respond in a relaxed, conversational tone like talking to a good friend.",
  professional: "You are a professional AI assistant. Provide formal, well-structured responses suitable for business contexts."
};

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: CONFIG.rateLimitWindow,
  max: CONFIG.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(CONFIG.rateLimitWindow / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Static file serving
app.use(express.static(__dirname + "/views")); // HTML
app.use(express.static(__dirname + "/public")); // JS, CSS

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('./package.json').version
  });
});

// API endpoints
app.get('/api/models', (req, res) => {
  const availableModels = [
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'openai/gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' }
  ];
  res.json(availableModels);
});

app.get('/api/personalities', (req, res) => {
  const personalities = Object.keys(PERSONALITY_PROMPTS).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    description: PERSONALITY_PROMPTS[key]
  }));
  res.json(personalities);
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Connection tracking
const connections = new Map();
let totalConnections = 0;
let activeConnections = 0;

// Socket.IO logic with enhanced features
io.on("connection", (socket) => {
  totalConnections++;
  activeConnections++;
  
  const clientInfo = {
    id: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date().toISOString(),
    messageCount: 0,
    lastActivity: new Date()
  };
  
  connections.set(socket.id, clientInfo);
  
  console.log(`✅ Client connected: ${socket.id} (${activeConnections} active, ${totalConnections} total)`);
  
  // Send connection confirmation
  socket.emit('connection-confirmed', {
    id: socket.id,
    serverTime: new Date().toISOString(),
    features: ['voice-chat', 'multiple-models', 'conversation-history', 'themes']
  });

  // Handle chat messages with enhanced processing
  socket.on("chat message", async (data) => {
    const startTime = Date.now();
    
    try {
      // Update client activity
      const client = connections.get(socket.id);
      if (client) {
        client.messageCount++;
        client.lastActivity = new Date();
      }

      // Handle both old string format and new object format
      let text, model, personality, learningMode, difficultyLevel, feedbackStyle;
      
      if (typeof data === 'string') {
        // Old format - just text
        text = data;
        model = 'openai/gpt-3.5-turbo';
        personality = 'conversation_partner';
        learningMode = 'conversation';
        difficultyLevel = 'intermediate';
        feedbackStyle = 'gentle';
      } else if (typeof data === 'object' && data !== null) {
        // New format - object with learning parameters
        text = data.text;
        model = data.model || 'openai/gpt-3.5-turbo';
        personality = data.personality || 'conversation_partner';
        learningMode = data.learningMode || 'conversation';
        difficultyLevel = data.difficultyLevel || 'intermediate';
        feedbackStyle = data.feedbackStyle || 'gentle';
      } else {
        throw new Error('Invalid message format');
      }

      if (!text || typeof text !== 'string') {
        throw new Error('Message text is required');
      }

      if (text.length > CONFIG.maxMessageLength) {
        throw new Error(`Message too long. Maximum ${CONFIG.maxMessageLength} characters allowed.`);
      }

      console.log(`🗣️ [${socket.id}] User said: "${text}" (Mode: ${learningMode}, Level: ${difficultyLevel})`);

      // Analyze speech for learning feedback
      const speechAnalysis = await analyzeSpeechForLearning(text, difficultyLevel, learningMode);

      // Get enhanced personality prompt with learning context
      const systemPrompt = getEnhancedTutorPrompt(personality, difficultyLevel, feedbackStyle, speechAnalysis);

      // Prepare API request with learning context
      const apiRequest = {
        model: model,
          messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Student said: "${text}"\n\nSpeech Analysis: ${JSON.stringify(speechAnalysis)}\n\nPlease provide appropriate feedback and continue the conversation.` }
        ],
        max_tokens: 600,
        temperature: 0.7,
        stream: false
      };

      // Make API call with retry logic
      const response = await makeAPICallWithRetry(apiRequest, CONFIG.maxRetries);
      
      if (!response || !response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response format');
      }

      const reply = response.data.choices[0].message.content;
      const processingTime = Date.now() - startTime;

      console.log(`🤖 [${socket.id}] Tutor reply (${processingTime}ms): "${reply}"`);

      // Send response with learning analytics
      socket.emit("tutor response", {
        reply: reply,
        speechAnalysis: speechAnalysis,
        learningFeedback: extractLearningFeedback(reply),
        metadata: {
          processingTime,
          model: model,
          personality: personality,
          learningMode: learningMode,
          difficultyLevel: difficultyLevel,
          timestamp: new Date().toISOString()
        }
      });

      // Update user progress
      await updateUserProgress(socket.id, speechAnalysis, learningMode);

      // Log learning interaction
      logLearningInteraction(socket.id, text, reply, speechAnalysis, learningMode, difficultyLevel, processingTime, true);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [${socket.id}] Error processing learning session (${processingTime}ms):`, error.message);

      let errorMessage = "I apologize, but I encountered an error. Please try again.";
      
      // Provide specific error messages for common issues
      if (error.message.includes('rate limit')) {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('Invalid message format') || error.message.includes('Message text is required')) {
        errorMessage = "Please provide a valid message.";
      } else if (error.message.includes('Message too long')) {
        errorMessage = error.message;
      }

      socket.emit("tutor response", {
        reply: errorMessage,
        speechAnalysis: null,
        learningFeedback: null,
        error: true
      });

      // Log failed interaction
      const failedText = typeof data === 'string' ? data : (data?.text || '');
      const failedMode = typeof data === 'object' ? (data?.learningMode || '') : '';
      logLearningInteraction(socket.id, failedText, errorMessage, null, failedMode, '', processingTime, false, error.message);
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    activeConnections--;
    const client = connections.get(socket.id);
    
    if (client) {
      const sessionDuration = Date.now() - new Date(client.connectedAt).getTime();
      console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason}, Duration: ${Math.round(sessionDuration/1000)}s, Messages: ${client.messageCount})`);
      connections.delete(socket.id);
    }
    
    console.log(`📊 Active connections: ${activeConnections}`);
  });

  // Handle ping for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// API call with retry logic
async function makeAPICallWithRetry(requestData, maxRetries = 3) {
  let lastError;
  
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ No OpenAI API key found, using fallback response');
    return createFallbackResponse(requestData);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API attempt ${attempt}/${maxRetries}`);
      
      const response = await axios.post(CONFIG.apiUrl, requestData, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "HTTP-Referer": `http://localhost:${CONFIG.port}`,
          "Content-Type": "application/json",
          "X-Title": "VoiceGPT Advanced"
        },
        timeout: CONFIG.timeout,
        validateStatus: (status) => status < 500 // Retry on server errors only
      });

      if (response.status === 429) {
        // Rate limited - wait before retry
        const retryAfter = parseInt(response.headers['retry-after']) || Math.pow(2, attempt);
        console.log(`⏳ Rate limited, waiting ${retryAfter}s before retry...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.status >= 400) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      return response;

    } catch (error) {
      lastError = error;
      console.error(`❌ API attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // If all API attempts failed, use fallback
  console.warn('⚠️ All API attempts failed, using fallback response');
  return createFallbackResponse(requestData);
}

// Create fallback response when API is not available
function createFallbackResponse(requestData) {
  const userMessage = requestData.messages?.[1]?.content || '';
  const isGreeting = /hello|hi|hey|good morning|good afternoon|good evening/i.test(userMessage);
  const isQuestion = userMessage.includes('?');
  
  let fallbackReply;
  
  if (isGreeting) {
    fallbackReply = "Hello! I'm your English tutor. I'm here to help you practice speaking English. Unfortunately, I'm currently running in demo mode without full AI capabilities, but I can still help you practice! Please continue speaking and I'll provide basic feedback.";
  } else if (isQuestion) {
    fallbackReply = "That's a great question! I can see you're practicing your English well. In full mode, I would provide detailed feedback on your grammar, pronunciation, and vocabulary. For now, keep practicing - your speech is being analyzed and you're doing great!";
  } else {
    fallbackReply = "Thank you for sharing that with me! I can see you're making good progress with your English speaking. Your message was clear and well-structured. Keep practicing and you'll continue to improve!";
  }
  
  return {
    data: {
      choices: [{
        message: {
          content: fallbackReply
        }
      }]
    }
  };
}

// Utility function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Speech Analysis for Learning
async function analyzeSpeechForLearning(text, difficultyLevel, learningMode) {
  const analysis = {
    originalText: text,
    wordCount: text.split(/\s+/).length,
    sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    grammarIssues: [],
    vocabularyLevel: '',
    pronunciationConcerns: [],
    fluencyScore: 0,
    suggestions: []
  };

  try {
    // Basic grammar analysis
    analysis.grammarIssues = analyzeGrammar(text);
    
    // Vocabulary assessment
    analysis.vocabularyLevel = assessVocabularyLevel(text, difficultyLevel);
    
    // Pronunciation concerns (based on common patterns)
    analysis.pronunciationConcerns = identifyPronunciationConcerns(text);
    
    // Fluency scoring
    analysis.fluencyScore = calculateFluencyScore(text, analysis.wordCount);
    
    // Generate suggestions based on learning mode
    analysis.suggestions = generateLearningSuggestions(analysis, learningMode, difficultyLevel);

  } catch (error) {
    console.error('Error in speech analysis:', error);
    analysis.error = 'Analysis temporarily unavailable';
  }

  return analysis;
}

// Basic Grammar Analysis
function analyzeGrammar(text) {
  const issues = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim().toLowerCase();
    
    // Check for common grammar issues
    if (trimmed.includes(' i ') && !trimmed.startsWith('i ')) {
      // Check if 'i' should be capitalized
      const iPositions = [];
      let pos = trimmed.indexOf(' i ');
      while (pos !== -1) {
        iPositions.push(pos + 1);
        pos = trimmed.indexOf(' i ', pos + 1);
      }
      if (iPositions.length > 0) {
        issues.push({
          type: 'capitalization',
          issue: 'The pronoun "I" should always be capitalized',
          suggestion: 'Remember to capitalize "I" when referring to yourself',
          severity: 'minor'
        });
      }
    }
    
    // Check for subject-verb agreement (basic)
    if (trimmed.includes(' are ') && (trimmed.includes(' i are ') || trimmed.includes(' he are ') || trimmed.includes(' she are '))) {
      issues.push({
        type: 'subject_verb_agreement',
        issue: 'Subject-verb disagreement detected',
        suggestion: 'Use "am" with "I", "is" with "he/she/it", "are" with "you/we/they"',
        severity: 'major'
      });
    }
    
    // Check for double negatives
    const negatives = ['not', 'no', 'never', 'nothing', 'nobody', 'nowhere'];
    const negativeCount = negatives.reduce((count, neg) => count + (trimmed.split(neg).length - 1), 0);
    if (negativeCount > 1) {
      issues.push({
        type: 'double_negative',
        issue: 'Avoid using double negatives in English',
        suggestion: 'Use only one negative word per clause',
        severity: 'major'
      });
    }
  });
  
  return issues;
}

// Vocabulary Level Assessment
function assessVocabularyLevel(text, targetLevel) {
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(words)];
  
  // Basic vocabulary lists (simplified)
  const basicWords = ['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must'];
  const intermediateWords = ['although', 'however', 'therefore', 'furthermore', 'nevertheless', 'consequently', 'specifically', 'particularly', 'especially'];
  const advancedWords = ['notwithstanding', 'subsequently', 'predominantly', 'substantially', 'comprehensively', 'systematically'];
  
  const basicCount = words.filter(word => basicWords.includes(word)).length;
  const intermediateCount = words.filter(word => intermediateWords.includes(word)).length;
  const advancedCount = words.filter(word => advancedWords.includes(word)).length;
  
  const totalWords = words.length;
  const basicRatio = basicCount / totalWords;
  const intermediateRatio = intermediateCount / totalWords;
  const advancedRatio = advancedCount / totalWords;
  
  if (advancedRatio > 0.1) return 'advanced';
  if (intermediateRatio > 0.05) return 'intermediate';
  return 'beginner';
}

// Pronunciation Concerns Identification
function identifyPronunciationConcerns(text) {
  const concerns = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Common pronunciation challenges
  const difficultWords = {
    'through': 'pronounced as "throo", not "throw"',
    'thought': 'pronounced as "thawt", with the "th" sound',
    'three': 'practice the "th" sound at the beginning',
    'world': 'pronounced as "wurld", not "word"',
    'work': 'pronounced as "wurk", with a clear "r" sound',
    'comfortable': 'pronounced as "KUHM-fər-tə-bəl", four syllables'
  };
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (difficultWords[cleanWord]) {
      concerns.push({
        word: cleanWord,
        tip: difficultWords[cleanWord],
        type: 'pronunciation'
      });
    }
  });
  
  return concerns;
}

// Fluency Score Calculation
function calculateFluencyScore(text, wordCount) {
  let score = 50; // Base score
  
  // Longer responses generally indicate better fluency
  if (wordCount > 20) score += 20;
  else if (wordCount > 10) score += 10;
  else if (wordCount < 5) score -= 20;
  
  // Check for complex sentence structures
  const complexMarkers = ['although', 'because', 'since', 'while', 'whereas', 'however', 'therefore'];
  const hasComplexStructure = complexMarkers.some(marker => text.toLowerCase().includes(marker));
  if (hasComplexStructure) score += 15;
  
  // Check for varied vocabulary (no repeated words)
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(words)];
  const varietyRatio = uniqueWords.length / words.length;
  if (varietyRatio > 0.8) score += 10;
  else if (varietyRatio < 0.6) score -= 10;
  
  return Math.min(100, Math.max(0, score));
}

// Generate Learning Suggestions
function generateLearningSuggestions(analysis, learningMode, difficultyLevel) {
  const suggestions = [];
  
  if (learningMode === 'grammar' && analysis.grammarIssues.length > 0) {
    suggestions.push('Focus on the grammar corrections provided above');
  }
  
  if (learningMode === 'vocabulary' && analysis.vocabularyLevel !== difficultyLevel) {
    if (analysis.vocabularyLevel === 'beginner' && difficultyLevel === 'intermediate') {
      suggestions.push('Try using more complex vocabulary and linking words');
    }
  }
  
  if (learningMode === 'fluency' && analysis.fluencyScore < 70) {
    suggestions.push('Try speaking in longer sentences and using connecting words');
  }
  
  if (analysis.wordCount < 10) {
    suggestions.push('Try to elaborate more on your thoughts - give examples or details');
  }
  
  return suggestions;
}

// Enhanced Tutor Prompt Generation
function getEnhancedTutorPrompt(personality, difficultyLevel, feedbackStyle, speechAnalysis) {
  let basePrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.conversation_partner;
  
  const difficultyContext = {
    beginner: "The student is a beginner. Use simple vocabulary and basic grammar. Be very encouraging and patient.",
    intermediate: "The student has intermediate skills. You can use more complex vocabulary and grammar structures.",
    advanced: "The student is advanced. Feel free to use sophisticated vocabulary and complex grammar.",
    native: "The student aims for native-level proficiency. Use natural, idiomatic expressions and advanced structures."
  };
  
  const feedbackContext = {
    gentle: "Provide feedback in a very encouraging and supportive way. Focus on positive reinforcement.",
    detailed: "Give comprehensive analysis with specific examples and explanations.",
    immediate: "Correct errors right away but keep the conversation flowing.",
    summary: "Focus on conversation flow now, save detailed feedback for the end."
  };
  
  return `${basePrompt}

Student Level: ${difficultyContext[difficultyLevel]}
Feedback Style: ${feedbackContext[feedbackStyle]}

Based on the speech analysis provided, adapt your response to help the student improve while maintaining an engaging conversation.`;
}

// Extract Learning Feedback from AI Response
function extractLearningFeedback(aiResponse) {
  const feedback = {
    grammar: [],
    pronunciation: [],
    vocabulary: [],
    general: []
  };
  
  // Parse structured feedback from AI response
  const feedbackRegex = /\[FEEDBACK\](.*?)(?=\[|$)/gs;
  const explanationRegex = /\[EXPLANATION\](.*?)(?=\[|$)/gs;
  const exampleRegex = /\[EXAMPLE\](.*?)(?=\[|$)/gs;
  const pronunciationRegex = /\[PRONUNCIATION\](.*?)(?=\[|$)/gs;
  const vocabularyRegex = /\[VOCABULARY\](.*?)(?=\[|$)/gs;
  
  let match;
  
  while ((match = feedbackRegex.exec(aiResponse)) !== null) {
    feedback.grammar.push(match[1].trim());
  }
  
  while ((match = pronunciationRegex.exec(aiResponse)) !== null) {
    feedback.pronunciation.push(match[1].trim());
  }
  
  while ((match = vocabularyRegex.exec(aiResponse)) !== null) {
    feedback.vocabulary.push(match[1].trim());
  }
  
  return feedback;
}

// Update User Progress
async function updateUserProgress(socketId, speechAnalysis, learningMode) {
  // In a real application, this would update a database
  // For now, we'll just log the progress
  const progressUpdate = {
    socketId,
    timestamp: new Date().toISOString(),
    learningMode,
    grammarScore: speechAnalysis.grammarIssues.length === 0 ? 100 : Math.max(0, 100 - (speechAnalysis.grammarIssues.length * 20)),
    fluencyScore: speechAnalysis.fluencyScore,
    vocabularyLevel: speechAnalysis.vocabularyLevel,
    wordCount: speechAnalysis.wordCount
  };
  
  console.log('📊 Progress Update:', JSON.stringify(progressUpdate, null, 2));
}

// Enhanced Logging for Learning Interactions
function logLearningInteraction(socketId, userMessage, tutorReply, speechAnalysis, learningMode, difficultyLevel, processingTime, success, errorDetails = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    socketId,
    userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    tutorReply: tutorReply.substring(0, 100) + (tutorReply.length > 100 ? '...' : ''),
    learningMode,
    difficultyLevel,
    speechAnalysis: speechAnalysis ? {
      wordCount: speechAnalysis.wordCount,
      grammarIssuesCount: speechAnalysis.grammarIssues.length,
      fluencyScore: speechAnalysis.fluencyScore,
      vocabularyLevel: speechAnalysis.vocabularyLevel
    } : null,
    processingTime,
    success,
    errorDetails
  };
  
  // In production, you might want to log to a file or database
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Learning Interaction:', JSON.stringify(logEntry, null, 2));
  }
}

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  http.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close all socket connections
    io.close(() => {
      console.log('✅ Socket.IO server closed');
      
      // Exit the process
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
http.listen(CONFIG.port, () => {
  console.log('🎓 English Tutor AI Server Started');
  console.log(`📍 Server running at http://localhost:${CONFIG.port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 API Key configured: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`⚡ Features: Speech Analysis, Grammar Checking, Progress Tracking`);
  console.log(`📊 Rate Limit: ${CONFIG.rateLimitMax} requests per ${CONFIG.rateLimitWindow/1000/60} minutes`);
  console.log('🎯 Ready for English learning sessions!');
});

