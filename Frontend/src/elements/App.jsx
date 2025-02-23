import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Auth0SignIn from './Auth0SignIn';
import Survey from './Survey';
import './App.css';
import Profile from './Profile';
import Settings from './Settings';
import WorkoutPlan from './WorkoutPlan';
import { auth0Config } from '../auth0-config';
import ErrorBoundary from './ErrorBoundary';
import DiningCourtMenu from './DiningCourtMenu';
import Dietary from './Dietary';
import Home from './Home';
import Motivation from './Motivation';
import Social from './Social';
import Favorites from './Favorites';
import WhereToEat from './WhereToEat';
import Congestion from './Congestion';

const App = () => {
  const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsSurvey, setNeedsSurvey] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [surveyData, setSurveyData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: auth0Config.audience,
            scope: auth0Config.scope
          }
        });

        // Sync user with database
        const syncResponse = await fetch('https://purduehealth.onrender.com/api/auth/auth0/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-User-Email': user.email
          }
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.message || 'Failed to sync user with database');
        }

        const syncData = await syncResponse.json();
        console.log('User sync successful:', syncData);

        if (isMounted) {
          setToken(accessToken);
          await checkSurveyStatus(user.email, accessToken);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setError(error.message);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, getAccessTokenSilently]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === null) {
      // If no theme is saved, set dark mode as default
      localStorage.setItem('darkMode', 'true');
      setIsDarkMode(true);
    } else {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  const checkSurveyStatus = async (userId, currentToken) => {
    try {
      if (!currentToken || !userId) {
        console.error('Missing token or userId for survey status check:', { 
          hasToken: !!currentToken, 
          userId 
        });
        return;
      }

      console.log('Checking survey status with:', { userId, tokenPresent: !!currentToken });
      
      const response = await fetch(`https://purduehealth.onrender.com/api/survey/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Survey status response:', data);

      if (!response.ok) {
        throw new Error(`Survey status check failed: ${response.statusText}`);
      }

      setNeedsSurvey(!data.hasTakenSurvey);
    } catch (error) {
      console.error('Error checking survey status:', error);
      // Don't set needsSurvey here - keep previous state
    }
  };

  const handleSurveyComplete = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNeedsSurvey(false);
      if (user?.email) {
        try {
          const surveyResponse = await fetch(`https://purduehealth.onrender.com/api/survey/status/${user.email}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const surveyData = await surveyResponse.json();
          
          if (!surveyData.hasTakenSurvey) {
            throw new Error('Survey data not yet saved');
          }

          await generateWorkoutPlan(user.email);
        } catch (error) {
          console.error('Error verifying survey data:', error);
          setNeedsSurvey(true);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in handleSurveyComplete:', error);
      alert('There was an error saving your survey. Please try again.');
    }
  };

  const generateWorkoutPlan = async (userId) => {
    try {
        const surveyCheckResponse = await fetch(`https://purduehealth.onrender.com/api/survey/status/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const surveyStatus = await surveyCheckResponse.json();
        if (!surveyStatus.hasTakenSurvey) {
            throw new Error('Please complete the survey first');
        }

        const response = await fetch(`https://purduehealth.onrender.com/api/workout-plan/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log('Raw response:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate workout plan');
        }

        setWorkoutPlan(data);
        return data;
    } catch (error) {
        console.error('Error generating workout plan:', error);
        throw error;
    }
};

  const fetchSurveyData = useCallback(async () => {
    if (!token || !user?.email) return;
    
    try {
      const response = await fetch(`https://purduehealth.onrender.com/api/survey/data/${user.email}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch survey data');
      const data = await response.json();
      setSurveyData(data.answers);
    } catch (error) {
      console.error('Error fetching survey data:', error);
    }
  }, [token, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSurveyData();
    }
  }, [isAuthenticated, fetchSurveyData]);

  useEffect(() => {
    const handleWorkoutPlanUpdate = () => {
      if (user?.email) {
        generateWorkoutPlan(user.email);
      }
    };

    window.addEventListener('workoutPlanUpdated', handleWorkoutPlanUpdate);
    return () => {
      window.removeEventListener('workoutPlanUpdated', handleWorkoutPlanUpdate);
    };
  }, [user, generateWorkoutPlan]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout({ 
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    // Clear local state
    setToken(null);
    setNeedsSurvey(true);
    setWorkoutPlan(null);
    setActiveView('home');
    closeMenu();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    localStorage.setItem('darkMode', !isDarkMode);
  };

  if (!isAuthenticated) {
    return <Auth0SignIn />;
  }

  return (
    <div className="App">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {needsSurvey && user?.email ? (
        <Survey 
          userId={user.email}
          token={token}
          onComplete={handleSurveyComplete}
        />
      ) : (
        <ErrorBoundary>
          <div className="App">
            {!isAuthenticated ? (
              <Auth0SignIn />
            ) : needsSurvey ? (
              <Survey 
                userId={user?.email}
                token={token} 
                onComplete={handleSurveyComplete} 
              />
            ) : (
              <div className="app-main">
                <header className="main-header">
                  <div className="menu-icon" onClick={toggleMenu}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                  </div>
                  <div className="header-title">BoilerFit</div>
                </header>
                {menuOpen && (
                  <nav className="side-menu">
                    <ul>
                      {[
                        { id: 'home', label: 'Home' },
                        { id: 'profile', label: 'Profile' },
                        { id: 'workoutPlan', label: 'Workout Plan' },
                        { id: 'diningCourtMenu', label: 'Dining Court Menu' },
                        { id: 'settings', label: 'Settings' },
                        { id: 'dietary', label: 'Dietary' },
                        { id: 'motivation', label: 'Motivation' },
                        { id: 'social', label: 'Social' },
                        { id: 'favorites', label: 'Favorites' },
                        { id: 'whereToEat', label: 'Where to Eat' },
                        { id: 'congestion', label: 'Facility Usage' }
                      ].map(item => (
                        <li
                          key={item.id}
                          className={activeView === item.id ? 'active' : ''}
                          onClick={() => {
                            setActiveView(item.id);
                            closeMenu();
                          }}
                        >
                          {item.label}
                        </li>
                      ))}
                      <li onClick={handleLogout}>Log Out</li>
                    </ul>
                  </nav>
                )}
                <main className="main-content">
                  {activeView === 'home' ? (
                    <Home />
                  ) : activeView === 'profile' ? (
                    <Profile userId={user.email} token={token} />
                  ) : activeView === 'settings' ? (
                    <Settings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                  ) : activeView === 'workoutPlan' ? (
                    <WorkoutPlan 
                      userId={user.email} 
                      token={token} 
                      workoutPlan={workoutPlan}
                      onRegenerateClick={() => generateWorkoutPlan(user.email)}
                    />
                  ) : activeView === 'diningCourtMenu' ? (
                    <DiningCourtMenu />
                  ) : activeView === 'dietary' ? (
                    <Dietary 
                      userId={user.email} 
                      token={token}
                      surveyData={surveyData}
                    />
                  ) : activeView === 'motivation' ? (
                    <Motivation 
                      userId={user.email}
                      token={token}
                    />
                  ) : activeView === 'social' ? (
                    <Social 
                      userId={user.email}
                      token={token}
                    />
                  ) : activeView === 'favorites' ? (
                    <Favorites 
                      userId={user.email}
                      token={token}
                    />
                  ) : activeView === 'whereToEat' ? (
                    <WhereToEat 
                      userId={user.email}
                      token={token}
                    />
                  ) : activeView === 'congestion' ? (
                    <Congestion />
                  ) : null}
                </main>
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;

