import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css'; 
import './LoginPage.css';

const API_BASE_URL = 'http://localhost:8000';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [particles, setParticles] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const features = [
    {
      icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      text: "AI-Powered Feedback"
    },
    {
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
      text: "Secure & Private"
    },
    {
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      text: "Real-time Analysis"
    }
  ];

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isRegistering ? '/register' : '/login';
    
    try {
      let options = {};
      
      if (isRegistering) {
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        };
      } else {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        options = {
          method: 'POST',
          body: formData,
        };
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('token', data.access_token);
      navigate('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { width: 0, label: '', color: '' };
    if (password.length < 6) return { width: 33, label: 'Weak', color: 'weak' };
    if (password.length < 10) return { width: 66, label: 'Medium', color: 'medium' };
    return { width: 100, label: 'Strong', color: 'strong' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="login-page-container" ref={containerRef}>
      {/* Animated Background Particles */}
      <div className="particles-container">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Mouse Follower Gradient */}
      <div
        className="mouse-gradient"
        style={{
          background: `radial-gradient(circle 400px at ${mousePosition.x}% ${mousePosition.y}%, rgba(162, 123, 92, 0.15), transparent)`,
        }}
      />

      {/* Main Content Container - 50/50 Split */}
      <div className="split-container">
        {/* Left Side - About Section (50%) */}
        <div className="about-section">
          <div className="about-content">
            {/* Brand Header */}
            <div className="brand-header">
              <div className="brand-logo">
                <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="brand-title">AI Interview Coach</h1>
              <p className="brand-tagline">Master Your Interview Skills</p>
            </div>

            {/* Description */}
            <div className="about-description">
              <p className="description-text">
                Prepare for your dream job with AI-powered mock interviews. 
                Get instant feedback, track your progress, and boost your confidence.
              </p>
            </div>

            {/* Features */}
            <div className="features-compact">
              {features.map((feature, index) => (
                <div key={index} className="feature-compact" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="feature-compact-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  <span className="feature-compact-text">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="stats-compact">
              <div className="stat-compact">
                <span className="stat-compact-value">50K+</span>
                <span className="stat-compact-label">Users</span>
              </div>
              <div className="stat-compact">
                <span className="stat-compact-value">95%</span>
                <span className="stat-compact-label">Success Rate</span>
              </div>
              <div className="stat-compact">
                <span className="stat-compact-value">1M+</span>
                <span className="stat-compact-label">Interviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Section (50%) */}
        <div className="auth-section">
          <div className="auth-wrapper">
            <div className="auth-card">
              {/* Corner Decorations */}
              <div className="corner-decoration top-left" />
              <div className="corner-decoration top-right" />
              <div className="corner-decoration bottom-left" />
              <div className="corner-decoration bottom-right" />

              {/* Auth Header */}
              <div className="auth-header">
                <div className="auth-icon-wrapper">
                  <svg className="auth-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={isRegistering 
                        ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      }
                    />
                  </svg>
                </div>
                <h2 className="auth-title">
                  {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="auth-description">
                  {isRegistering 
                    ? 'Start your journey to interview mastery' 
                    : 'Continue your path to success'}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="alert alert-error">
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="alert-content">
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="auth-form">
                {/* Email Field */}
                <div className={`form-group ${emailFocused ? 'focused' : ''} ${email ? 'filled' : ''}`}>
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email Address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="your.email@example.com"
                      required
                    />
                    {email && (
                      <div className="input-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div className={`form-group ${passwordFocused ? 'focused' : ''} ${password ? 'filled' : ''}`}>
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Password</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={showPassword 
                            ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          }
                        />
                      </svg>
                    </button>
                    {password && (
                      <div className="input-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {password && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div 
                          className={`strength-fill ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.width}%` }}
                        />
                      </div>
                      {passwordStrength.label && (
                        <span className={`strength-label ${passwordStrength.color}`}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className={`btn-submit ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      <span>Processing</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                      <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="divider">
                <span className="divider-line" />
                <span className="divider-text">OR</span>
                <span className="divider-line" />
              </div>

              {/* Toggle Mode */}
              <button 
                className="btn-toggle"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
              >
                <span>
                  {isRegistering 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Create One"}
                </span>
                <svg className="toggle-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;