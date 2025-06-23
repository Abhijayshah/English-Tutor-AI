// Enhanced Microphone Diagnostic and Scoring System
// This file provides comprehensive microphone fixes and scoring functions

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
        
        diagnostics.microphoneAccess = true;
        diagnostics.permissions = 'granted';
        
        // Test audio levels
        if (diagnostics.audioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          analyser.fftSize = 256;
          microphone.connect(analyser);
          
          // Test for audio input
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
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
    fixes.push('Go to browser settings and enable microphone permissions');
  }
  
  if (diagnostics.permissions === 'NotFoundError') {
    fixes.push('Connect a microphone to your device');
    fixes.push('Check that your microphone is working in other applications');
  }
  
  if (diagnostics.permissions === 'NotReadableError') {
    fixes.push('Close other applications using the microphone');
    fixes.push('Restart your browser');
  }
  
  const resultHtml = `
    <div class="microphone-diagnostic">
      <h3>🔧 Microphone Diagnostic Results</h3>
      
      <div class="diagnostic-status">
        <div class="status-item ${diagnostics.browserSupport ? 'success' : 'error'}">
          <span class="status-dot">●</span> Browser Support: ${diagnostics.browserSupport ? 'OK' : 'Failed'}
        </div>
        <div class="status-item ${diagnostics.mediaDevicesAPI ? 'success' : 'error'}">
          <span class="status-dot">●</span> Media Devices API: ${diagnostics.mediaDevicesAPI ? 'OK' : 'Failed'}
        </div>
        <div class="status-item ${diagnostics.speechRecognition ? 'success' : 'error'}">
          <span class="status-dot">●</span> Speech Recognition: ${diagnostics.speechRecognition ? 'OK' : 'Failed'}
        </div>
        <div class="status-item ${diagnostics.microphoneAccess ? 'success' : 'error'}">
          <span class="status-dot">●</span> Microphone Access: ${diagnostics.microphoneAccess ? 'OK' : 'Failed'}
        </div>
        <div class="status-item ${diagnostics.audioContext ? 'success' : 'error'}">
          <span class="status-dot">●</span> Audio Context: ${diagnostics.audioContext ? 'OK' : 'Failed'}
        </div>
        <div class="status-item info">
          <span class="status-dot">●</span> Permissions: ${diagnostics.permissions}
        </div>
      </div>
      
      ${issues.length > 0 ? `
        <div class="diagnostic-issues">
          <h4>❌ Issues Found:</h4>
          <ul>
            ${issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : '<div class="diagnostic-success"><h4>✅ All checks passed!</h4></div>'}
      
      ${fixes.length > 0 ? `
        <div class="diagnostic-fixes">
          <h4>💡 Recommended Fixes:</h4>
          <ol>
            ${fixes.map(fix => `<li>${fix}</li>`).join('')}
          </ol>
        </div>
      ` : ''}
      
      ${diagnostics.errors.length > 0 ? `
        <div class="diagnostic-errors">
          <h4>⚠️ Error Details:</h4>
          <ul>
            ${diagnostics.errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="diagnostic-actions">
        <button onclick="autoFixMicrophoneIssues()" class="fix-btn">🔧 Auto-Fix Issues</button>
        <button onclick="testMicrophoneAccess()" class="test-btn">🎤 Test Microphone</button>
        <button onclick="hideToast()" class="close-btn">✖ Close</button>
      </div>
    </div>
  `;
  
  // Show with custom styling
  const toast = document.getElementById('error-toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (toast && toastMessage) {
    toastMessage.innerHTML = resultHtml;
    toast.className = 'toast diagnostic show';
    
    // Don't auto-hide diagnostic results
    clearTimeout(window.toastTimeout);
  }
}

// Auto-fix microphone issues
function autoFixMicrophoneIssues() {
  console.log('🔧 Auto-fixing microphone issues...');
  
  try {
    // Reinitialize speech recognition
    if (!recognition && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      console.log('🔧 Reinitializing speech recognition...');
      initializeSpeechRecognition();
    }
    
    // Test microphone access again
    console.log('🔧 Testing microphone access...');
    testMicrophoneAccess();
    
    // Update UI state
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.style.opacity = '1';
      micBtn.title = 'Click to start recording';
    }
    
    // Clear any error states
    const elements = {
      outputBot: document.querySelector('.output-bot'),
      outputYou: document.querySelector('.output-you')
    };
    
    if (elements.outputBot && elements.outputBot.textContent.includes('error')) {
      elements.outputBot.textContent = 'Microphone issues fixed. Click the microphone to start speaking!';
    }
    
    showToast('🔧 Microphone auto-fix completed. Try speaking now!', 'success');
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
    showToast('❌ Auto-fix failed. Please try the manual fixes suggested above.', 'error');
  }
}

// Enhanced microphone test
async function enhancedMicrophoneTest() {
  console.log('🎤 Running enhanced microphone test...');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } 
    });
    
    // Create audio context for level testing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    microphone.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Test for 3 seconds
    let maxLevel = 0;
    let testCount = 0;
    const testInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const currentLevel = Math.max(...dataArray);
      maxLevel = Math.max(maxLevel, currentLevel);
      testCount++;
      
      if (testCount >= 30) { // 3 seconds of testing
        clearInterval(testInterval);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
        // Show results
        if (maxLevel > 10) {
          showToast(`✅ Microphone test passed! Peak level: ${maxLevel}/255`, 'success');
        } else {
          showToast(`⚠️ Microphone test warning: Very low audio levels detected (${maxLevel}/255). Check your microphone volume.`, 'warning');
        }
      }
    }, 100);
    
    showToast('🎤 Testing microphone for 3 seconds... Please speak!', 'info');
    
  } catch (error) {
    console.error('❌ Enhanced microphone test failed:', error);
    showToast(`❌ Microphone test failed: ${error.message}`, 'error');
  }
}

// Add diagnostic button to the interface
function addDiagnosticButton() {
  const controlsContainer = document.querySelector('.controls');
  if (!controlsContainer || document.getElementById('diagnostic-btn')) return;
  
  const diagnosticBtn = document.createElement('button');
  diagnosticBtn.id = 'diagnostic-btn';
  diagnosticBtn.className = 'control-btn diagnostic-btn';
  diagnosticBtn.innerHTML = '<i class="fas fa-stethoscope"></i>';
  diagnosticBtn.title = 'Run Microphone Diagnostic';
  diagnosticBtn.onclick = runMicrophoneDiagnostic;
  
  controlsContainer.appendChild(diagnosticBtn);
}

// Initialize diagnostic features
function initializeDiagnostics() {
  // Add diagnostic button
  addDiagnosticButton();
  
  // Auto-run diagnostic if issues detected
  setTimeout(() => {
    const micBtn = document.getElementById('mic-btn');
    if (!recognition || (micBtn && micBtn.disabled)) {
      console.log('🔧 Microphone issues detected, running auto-diagnostic...');
      runMicrophoneDiagnostic();
    }
  }, 3000);
  
  // Add CSS for diagnostic styling
  const diagnosticCSS = `
    .diagnostic-btn {
      background: linear-gradient(135deg, #FF6B6B, #FF8E53);
      border: none;
      color: white;
      padding: 12px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    }
    
    .diagnostic-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    }
    
    .microphone-diagnostic {
      max-width: 600px;
      text-align: left;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .diagnostic-status {
      margin: 20px 0;
    }
    
    .status-item {
      padding: 8px 0;
      display: flex;
      align-items: center;
      font-weight: 500;
    }
    
    .status-item.success { color: #4CAF50; }
    .status-item.error { color: #F44336; }
    .status-item.info { color: #2196F3; }
    
    .status-dot {
      margin-right: 10px;
      font-size: 12px;
    }
    
    .diagnostic-issues, .diagnostic-fixes, .diagnostic-errors {
      margin: 20px 0;
      padding: 15px;
      border-radius: 8px;
      background: rgba(0,0,0,0.05);
    }
    
    .diagnostic-issues h4 { color: #F44336; }
    .diagnostic-fixes h4 { color: #FF9800; }
    .diagnostic-errors h4 { color: #F44336; }
    .diagnostic-success h4 { color: #4CAF50; }
    
    .diagnostic-actions {
      margin-top: 20px;
      text-align: center;
    }
    
    .diagnostic-actions button {
      margin: 5px;
      padding: 10px 20px;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .fix-btn {
      background: linear-gradient(135deg, #4CAF50, #66BB6A);
      color: white;
    }
    
    .test-btn {
      background: linear-gradient(135deg, #2196F3, #42A5F5);
      color: white;
    }
    
    .close-btn {
      background: linear-gradient(135deg, #757575, #9E9E9E);
      color: white;
    }
    
    .diagnostic-actions button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    .toast.diagnostic {
      max-width: 700px;
      width: 90vw;
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = diagnosticCSS;
  document.head.appendChild(style);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDiagnostics);
} else {
  initializeDiagnostics();
}

// Make functions globally available
window.updateComprehensiveScores = updateComprehensiveScores;
window.displayEnhancedFeedback = displayEnhancedFeedback;
window.updateSessionMetadata = updateSessionMetadata;
window.generateSessionReport = generateSessionReport;
window.runMicrophoneDiagnostic = runMicrophoneDiagnostic;
window.autoFixMicrophoneIssues = autoFixMicrophoneIssues;
window.enhancedMicrophoneTest = enhancedMicrophoneTest; 