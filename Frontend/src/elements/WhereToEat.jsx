import React, { useState, useEffect, useCallback } from 'react';
import './WhereToEat.css';

const WhereToEat = ({ userId, token }) => {
  const [groups, setGroups] = useState([]);
  const [selectedOption, setSelectedOption] = useState('solo');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mealTime, setMealTime] = useState('');
  const [mealPeriods, setMealPeriods] = useState([]);
  const [selectedMealPeriod, setSelectedMealPeriod] = useState(null);

  // Get meal periods for today and tomorrow
  const getMealPeriods = useCallback(() => {
    const now = new Date();
    const periods = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to add periods
    const addPeriod = (date, periodName, startHour, endHour) => {
      const currentHour = now.getHours();
      const isPast = date.getDate() === today.getDate() && currentHour >= endHour;
      if (!isPast) {
        periods.push({
          label: `${periodName} - ${date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}`,
          value: {
            period: periodName,
            date: formatDate(date)
          }
        });
      }
    };

    // Add periods for today and tomorrow
    addPeriod(today, 'Breakfast', 7, 10);
    addPeriod(today, 'Lunch', 10, 14);
    addPeriod(today, 'Dinner', 17, 21);
    addPeriod(tomorrow, 'Breakfast', 7, 10);
    addPeriod(tomorrow, 'Lunch', 10, 14);
    addPeriod(tomorrow, 'Dinner', 17, 21);

    return periods;
  }, []);

  // Update meal periods
  useEffect(() => {
    const periods = getMealPeriods();
    setMealPeriods(periods);
    setSelectedMealPeriod(periods[0]?.value);
  }, [getMealPeriods]);

  // Fetch user's groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/social/groups/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch groups');
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        setError('Failed to load groups');
      }
    };

    fetchGroups();
  }, [userId, token]);

  const getRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/recommendations/dining', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          groupId: selectedOption === 'group' ? selectedGroup : null,
          mealPeriod: selectedMealPeriod.period,
          date: selectedMealPeriod.date
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get recommendation');
      }
      
      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="where-to-eat-container">
      <h2>Where to Eat?</h2>
      
      <div className="meal-period-selector">
        <h3>Select Meal Period</h3>
        <select 
          value={JSON.stringify(selectedMealPeriod)}
          onChange={(e) => setSelectedMealPeriod(JSON.parse(e.target.value))}
          className="meal-period-select"
        >
          {mealPeriods.map((period, index) => (
            <option key={index} value={JSON.stringify(period.value)}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className="dining-options">
        <div className="option-selector">
          <h3>Dining Preference</h3>
          <label className="radio-label">
            <input
              type="radio"
              value="solo"
              checked={selectedOption === 'solo'}
              onChange={(e) => {
                setSelectedOption(e.target.value);
                setSelectedGroup(null);
              }}
            />
            <span>Eating by myself</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              value="group"
              checked={selectedOption === 'group'}
              onChange={(e) => setSelectedOption(e.target.value)}
            />
            <span>Eating with a group</span>
          </label>
        </div>

        {selectedOption === 'group' && (
          <div className="group-selector">
            <h3>Select Group</h3>
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="group-select"
            >
              <option value="">Choose a group</option>
              {groups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.name} ({group.members?.length || 0} members)
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          onClick={getRecommendation}
          disabled={loading || (selectedOption === 'group' && !selectedGroup)}
          className="get-recommendation-btn"
        >
          {loading ? 'Finding best option...' : 'Get Recommendation'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}

      {recommendation && (
        <div className="recommendation-card">
          <h3>Dining Court Recommendation</h3>
          {recommendation.isOpen === false ? (
            <div className="closed-message">
              {recommendation.message}
            </div>
          ) : (
            <>
              <div className="recommended-court">
                <h4>{recommendation.diningCourt}</h4>
                <div className="recommendation-details">
                  {recommendation.confidence > 0 ? (
                    <>
                      <div className="confidence-meter">
                        <div 
                          className="confidence-fill"
                          style={{ width: `${recommendation.confidence}%` }}
                        />
                      </div>
                      <p className="confidence">Match Score: {recommendation.confidence}%</p>
                    </>
                  ) : (
                    <p className="random-selection">{recommendation.message}</p>
                  )}
                </div>
              </div>
              
              {recommendation.matchingItems?.length > 0 && (
                <div className="matching-items">
                  <h4>Menu Items You'll Love:</h4>
                  <div className="items-grid">
                    {recommendation.matchingItems.map(item => (
                      <div key={item.name} className="menu-item-card">
                        <h5>{item.name}</h5>
                        {item.matchedPreference && (
                          <span className="match-reason">
                            Matches: {item.matchedPreference}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WhereToEat;