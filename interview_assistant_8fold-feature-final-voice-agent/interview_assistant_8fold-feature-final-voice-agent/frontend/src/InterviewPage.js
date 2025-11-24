import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import AudioVisualizer from './AudioVisualizer';

const API_BASE_URL = 'http://localhost:8000';

function InterviewPage() {
  // --- Standard State ---
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);

  // --- Voice State ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interactionMode, setInteractionMode] = useState('TEXT'); // 'TEXT' or 'VOICE'
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Refs for Voice Logic
  const silenceTimer = useRef(null);
  const noInputTimer = useRef(null);
  const recognitionRef = useRef(null);
  
  const navigate = useNavigate();

  // --- Auth Check ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  // --- Auto-scrolling Effect ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----------------------------------------------------------------------
  // 🔊 SPEECH OUTPUT (Text-to-Speech)
  // ----------------------------------------------------------------------
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // We don't call stopListening here to avoid circular dependency if possible, 
    // but usually we want to stop listening while speaking.
    // For now, we'll manage isListening state in the caller or effects.
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0; 

    utterance.onend = () => {
      setIsSpeaking(false);
      // We can't easily call startListening here without circular dependency or ref usage.
      // We'll rely on the effect or a ref-based helper if needed.
      // For this simple version, we might need to manually restart listening 
      // or use a useEffect that watches isSpeaking.
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Restart listening after speaking ends (if in voice mode)
  useEffect(() => {
    if (interactionMode === 'VOICE' && !isSpeaking && !isListening && !interviewEnded && interviewStarted) {
        // Small delay to avoid picking up self
        const timer = setTimeout(() => {
             startListening();
        }, 500);
        return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, interactionMode, interviewEnded, interviewStarted]);


  // ----------------------------------------------------------------------
  // 🎙️ SPEECH INPUT (Speech-to-Text)
  // ----------------------------------------------------------------------
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser not supported. Please use Chrome.");
      return;
    }
    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true; 
    recognition.continuous = true;     

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setUserInput(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Mic Error:", event.error);
      setIsListening(false);
    };

    try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    } catch(e) {
        console.error("Mic start failed", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleVoiceMode = () => {
    if (interactionMode === 'TEXT') {
      setInteractionMode('VOICE');
      if (interviewStarted && !isLoading) startListening();
    } else {
      setInteractionMode('TEXT');
      stopListening();
      window.speechSynthesis.cancel();
    }
  };

  // ----------------------------------------------------------------------
  // API FUNCTIONS
  // ----------------------------------------------------------------------
  
  const processMessageToBackend = useCallback(async (textToSend) => {
    setIsLoading(true);
    setError(null); // Clear error
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/stream_interview`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          response: textToSend,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      setMessages(prev => [...prev, { sender: 'ai', text: '', isStreaming: true }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Functional update to avoid closure staleness
        const currentText = fullResponse;
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.sender === 'ai' && lastMsg.isStreaming) {
                lastMsg.text = currentText;
            }
            return newMessages;
        });
      }

      setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.sender === 'ai') {
              lastMsg.isStreaming = false;
          }
          return newMessages;
      });

      if (interactionMode === 'VOICE') {
        speak(fullResponse);
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setError('Failed to get AI response.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, interactionMode, speak]);

  const sendMessage = useCallback(async () => {
    if (!userInput.trim() && !isListening) return; 
    
    const text = userInput;
    setUserInput(''); 
    setMessages(prev => [...prev, { sender: 'user', text: text }]); 
    
    await processMessageToBackend(text);
  }, [userInput, isListening, processMessageToBackend]);

  const sendSilentMessage = useCallback(async () => {
    const silentCode = "(Candidate remained silent)";
    setMessages(prev => [...prev, { sender: 'system', text: '⏳ No audio detected. Checking in...' }]);
    await processMessageToBackend(silentCode);
  }, [processMessageToBackend]);

  // ----------------------------------------------------------------------
  // 🎤 HANDS-FREE LOGIC: Silence Detection & Patience Timer
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (interactionMode === 'VOICE' && isListening) {
      if (userInput.trim().length > 0) {
        if (noInputTimer.current) clearTimeout(noInputTimer.current);
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        silenceTimer.current = setTimeout(() => {
          console.log("Silence detected. Auto-sending...");
          stopListening(); 
          sendMessage();   
        }, 2000); 
      } else {
        if (noInputTimer.current) clearTimeout(noInputTimer.current);
        noInputTimer.current = setTimeout(() => {
          console.log("User is silent. Sending nudge...");
          stopListening();
          sendSilentMessage(); 
        }, 10000); 
      }
    }
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (noInputTimer.current) clearTimeout(noInputTimer.current);
    };
  }, [userInput, isListening, interactionMode, sendMessage, sendSilentMessage, stopListening]);


  // ----------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ----------------------------------------------------------------------
  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { sender: 'system', text }]);
  };

  const clearError = () => {
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      clearError();
    } else {
      setError('Please upload a valid PDF file.');
      e.target.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startInterview = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!jobDescription.trim()) { setError('Please provide a job description.'); return; }
    if (!resumeFile) { setError('Please upload your resume (PDF format).'); return; }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('job_description', jobDescription);
    formData.append('resume', resumeFile);

    const token = localStorage.getItem('token'); // Get Token

    try {
      const response = await fetch(`${API_BASE_URL}/start_interview`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}` // Send Token
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.session_id);
      setMessages([{ sender: 'ai', text: data.message }]);
      setInterviewStarted(true);
      
      if (interactionMode === 'VOICE') {
        speak(data.message);
      } else {
        addSystemMessage('Tip: Take your time to think through your answers. Good luck!');
      }

    } catch (error) {
      console.error('Error starting interview:', error);
      setError(error.message || 'Failed to start interview.');
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    if (!sessionId || interviewEnded) return;
    stopListening();
    window.speechSynthesis.cancel();

    setIsLoading(true);
    setInterviewEnded(true);
    clearError();
    addSystemMessage('Analyzing your performance and generating feedback report...');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/end_interview`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.warning || errorData.detail || "Server failed to generate PDF");
      }

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview_report_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      addSystemMessage('Report downloaded successfully! Review your feedback and keep improving.');
    } catch (error) {
      console.error('Error ending interview:', error);
      setError(`Report Generation Failed: ${error.message}`);
      setInterviewEnded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterview = () => {
    stopListening();
    window.speechSynthesis.cancel();
    setMessages([]);
    setInterviewStarted(false);
    setInterviewEnded(false);
    setJobDescription('');
    setResumeFile(null);
    setSessionId(null);
    setUserInput('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-wrapper">
          <div className="brand">
            <div className="brand-icon">AI</div>
            <div className="brand-text">
              <h1>Interview Coach</h1>
              <p className="brand-subtitle">Professional Interview Practice Platform</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert alert-error">
            <span className="alert-text">{error}</span>
            <button className="alert-close" onClick={clearError}>×</button>
          </div>
        )}

        {!interviewStarted ? (
          <div className="welcome-container">
            <div className="welcome-card">
              <div className="welcome-header">
                <h2>New Interview Session</h2>
                <p className="welcome-description">
                  Upload your resume and job description to start.
                </p>
              </div>

              <div className="mode-selector">
                <label className="mode-label">Select Interaction Mode</label>
                <div className="mode-buttons">
                  <button
                    type="button"
                    className={`mode-btn ${interactionMode === 'TEXT' ? 'active' : ''}`}
                    onClick={() => setInteractionMode('TEXT')}
                  >
                    <span>Chat Mode</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${interactionMode === 'VOICE' ? 'active' : ''}`}
                    onClick={() => setInteractionMode('VOICE')}
                  >
                    <span>Voice Mode (Hands-Free)</span>
                  </button>
                </div>
              </div>

              <form className="interview-form" onSubmit={startInterview}>
                <div className="form-field">
                  <label htmlFor="job-desc" className="field-label">Job Description *</label>
                  <textarea
                    id="job-desc"
                    className="field-input"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the complete job description..."
                    rows="6"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="resume" className="field-label">Resume Upload *</label>
                  <div className="file-upload">
                    <input
                      id="resume"
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf"
                      required
                      disabled={isLoading}
                      className="file-input"
                    />
                    <label htmlFor="resume" className="file-label">
                      {resumeFile ? (
                        <span className="file-name">✓ {resumeFile.name}</span>
                      ) : (
                        <span>Choose PDF file or drag and drop</span>
                      )}
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
                  {isLoading ? <span>Initializing...</span> : <span>Start Interview Session</span>}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="interview-container">
            <div className="interview-header">
              <div className="interview-status">
                <span className={`status-dot ${interviewEnded ? 'ended' : 'active'}`}></span>
                <span className="status-text">
                  {interviewEnded ? 'Interview Completed' : 'Interview in Progress'}
                </span>
              </div>

              {interactionMode === 'VOICE' && (
                <div className={`voice-indicator ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                  {isListening && <span>Listening... (Speak now)</span>}
                  {isSpeaking && <span>Alex is speaking...</span>}
                  {isLoading && !isSpeaking && <span>Processing...</span>}
                </div>
              )}

              <div className="interview-actions">
                <button onClick={endInterview} className="btn btn-success" disabled={isLoading || interviewEnded}>
                  {interviewEnded ? 'Completed' : 'End & Download Report'}
                </button>
                <button onClick={resetInterview} className="btn btn-secondary" disabled={isLoading}>New Session</button>
              </div>
            </div>

            <div className="messages-panel">
              <div className="messages-wrapper">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.sender}`}>
                    {msg.sender !== 'system' && (
                      <div className={`message-avatar ${msg.sender}`}>
                        {msg.sender === 'ai' ? 'AI' : 'You'}
                      </div>
                    )}
                    <div className={`message-content ${msg.sender} ${msg.isStreaming ? 'streaming' : ''}`}>
                      <p>{msg.text}</p>
                      {msg.isStreaming && <span className="typing-cursor"></span>}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {!interviewEnded && (
              <div className="input-panel">
                {interactionMode === 'VOICE' ? (
                  <div className="voice-interface">
                    {isListening ? (
                       <AudioVisualizer isListening={isListening} />
                    ) : (
                       <div style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #eee', margin: '10px 0', color: '#aaa'}}>
                         (Microphone Paused)
                       </div>
                    )}
                    
                    <div className="voice-transcript">
                      <p>{userInput || "..."}</p>
                    </div>
                    <button type="button" onClick={toggleVoiceMode} className="btn btn-danger">
                      Switch to Text Mode
                    </button>
                  </div>
                ) : (
                  <div className="text-interface">
                    <textarea
                      className="message-input"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your response here..."
                      disabled={isLoading}
                      rows="3"
                    />
                    <div className="input-actions">
                      <button onClick={toggleVoiceMode} className="btn btn-icon" title="Switch to Voice">Mic</button>
                      <button onClick={sendMessage} disabled={isLoading || !userInput.trim()} className="btn btn-primary">
                        {isLoading ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="app-footer"><p>Alex AI Assistant</p></footer>
    </div>
  );
}

export default InterviewPage;
