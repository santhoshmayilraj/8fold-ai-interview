import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import './App.css';
import './DashboardPage.css';

const API_BASE_URL = 'http://localhost:8000';

function DashboardPage() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    improvementRate: 0
  });
  const [skillsData, setSkillsData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    
    // Fetch User Profile & Analytics
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
          
          // Calculate stats
          if (data.history && data.history.length > 0) {
            const scores = data.history.map(h => h.score);
            const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            const bestScore = Math.max(...scores);
            const improvement = scores.length > 1 
              ? (((scores[scores.length - 1] - scores[0]) / scores[0]) * 100).toFixed(0)
              : 0;

            setStats({
              totalSessions: data.history.length,
              averageScore: avgScore,
              bestScore: bestScore,
              improvementRate: improvement
            });

            // Mock skills data (replace with real API data)
            setSkillsData([
              { skill: 'Communication', score: 8.5, fullMark: 10 },
              { skill: 'Technical', score: 7.8, fullMark: 10 },
              { skill: 'Problem Solving', score: 8.2, fullMark: 10 },
              { skill: 'Leadership', score: 7.5, fullMark: 10 },
              { skill: 'Adaptability', score: 8.0, fullMark: 10 }
            ]);

            // Time spent data
            setTimeData([
              { day: 'Mon', minutes: 45 },
              { day: 'Tue', minutes: 60 },
              { day: 'Wed', minutes: 30 },
              { day: 'Thu', minutes: 75 },
              { day: 'Fri', minutes: 50 },
              { day: 'Sat', minutes: 90 },
              { day: 'Sun', minutes: 40 }
            ]);
          }

          setUser({ email: data.email || "Candidate", ...data });
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const startNewInterview = () => {
    navigate('/interview');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-logo-dash">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 2L2 7L12 12L22 7L12 2Z M2 17L12 22L22 17 M2 12L12 17L22 12" />
              </svg>
            </div>
            <div className="brand-text">
              <h1>AI Interview Coach</h1>
              <p>Dashboard</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Welcome back, {user?.email?.split('@')[0]}! 👋</h2>
              <p>Ready to level up your interview skills? Let's make today count!</p>
            </div>
            <button onClick={startNewInterview} className="btn-start-interview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Start New Practice Session</span>
            </button>
          </div>
          <div className="welcome-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card-1">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Total Sessions</h3>
              <p className="stat-value">{stats.totalSessions}</p>
              <span className="stat-label">Practice interviews</span>
            </div>
          </div>

          <div className="stat-card stat-card-2">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Average Score</h3>
              <p className="stat-value">{stats.averageScore}<span>/10</span></p>
              <span className="stat-label">Overall performance</span>
            </div>
          </div>

          <div className="stat-card stat-card-3">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Best Score</h3>
              <p className="stat-value">{stats.bestScore}<span>/10</span></p>
              <span className="stat-label">Personal best</span>
            </div>
          </div>

          <div className="stat-card stat-card-4">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Improvement</h3>
              <p className="stat-value">
                {stats.improvementRate > 0 ? '+' : ''}{stats.improvementRate}<span>%</span>
              </p>
              <span className="stat-label">From first session</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Performance Trend Chart */}
          <div className="chart-card chart-card-large">
            <div className="chart-header">
              <h3>Performance Trend</h3>
              <span className="chart-badge">Last {history.length} Sessions</span>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a27b5c" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a27b5c" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(162, 123, 92, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#dcd7c9" 
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    stroke="#dcd7c9"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2d3436', 
                      border: '2px solid #a27b5c',
                      borderRadius: '12px',
                      color: '#dcd7c9'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#a27b5c" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skills Radar Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Skills Assessment</h3>
              <span className="chart-badge">Current Level</span>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={skillsData}>
                  <PolarGrid stroke="rgba(162, 123, 92, 0.2)" />
                  <PolarAngleAxis 
                    dataKey="skill" 
                    stroke="#dcd7c9"
                    style={{ fontSize: '11px' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 10]} 
                    stroke="#dcd7c9"
                    style={{ fontSize: '10px' }}
                  />
                  <Radar 
                    name="Your Score" 
                    dataKey="score" 
                    stroke="#a27b5c" 
                    fill="#a27b5c" 
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2d3436', 
                      border: '2px solid #a27b5c',
                      borderRadius: '12px',
                      color: '#dcd7c9'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Activity Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Weekly Activity</h3>
              <span className="chart-badge">Minutes Practiced</span>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(162, 123, 92, 0.1)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#dcd7c9"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#dcd7c9"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2d3436', 
                      border: '2px solid #a27b5c',
                      borderRadius: '12px',
                      color: '#dcd7c9'
                    }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="#a27b5c" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="recent-sessions-card">
          <div className="sessions-header">
            <h3>Recent Practice Sessions</h3>
            <button className="btn-view-all">
              <span>View All</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
          <div className="sessions-list">
            {history.slice().reverse().slice(0, 5).map((item, idx) => (
              <div key={idx} className="session-item">
                <div className="session-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="session-details">
                  <h4>Senior Developer Role</h4>
                  <p className="session-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {item.date}
                  </p>
                </div>
                <div className={`session-score ${item.score >= 7 ? 'score-high' : item.score >= 5 ? 'score-medium' : 'score-low'}`}>
                  <span className="score-value">{item.score}</span>
                  <span className="score-max">/10</span>
                </div>
                <button className="btn-session-details">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-grid">
          <div className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4>Study Materials</h4>
            <p>Access curated resources</p>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4>Detailed Analytics</h4>
            <p>Deep dive into metrics</p>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h4>Community</h4>
            <p>Connect with peers</p>
          </div>

          <div className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4>Settings</h4>
            <p>Customize your experience</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;