import React, { useState, useEffect } from 'react';
import './WhereToEat.css';

const WhereToEat = ({ userId, token }) => {
  const [groups, setGroups] = useState([]);
  const [selectedOption, setSelectedOption] = useState('solo');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mealTime, setMealTime] = useState('');

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

  // Update the meal time effect
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    
    let nextPeriod;
    let nextDate = new Date();
    
    if (hour >= 0 && hour < 7) {
      nextPeriod = 'Breakfast';
    } else if (hour >= 7 && hour < 10) {
      nextPeriod = 'Breakfast';
    } else if (hour >= 10 && hour < 14) {
      nextPeriod = 'Lunch';
    } else if (hour >= 14 && hour < 17) {
      nextPeriod = 'Dinner';
    } else if (hour >= 17 && hour < 21) {
      nextPeriod = 'Dinner';
    } else {
      nextPeriod = 'Breakfast';
      nextDate.setDate(nextDate.getDate() + 1);
    }
  
    const dateStr = nextDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  
    setMealTime(`${nextPeriod} - ${dateStr}`);
  }, []);

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
          mealTime
        })
      });

      if (!response.ok) throw new Error('Failed to get recommendation');
      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      setError('Failed to get dining recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="where-to-eat-container">
      <h2>Where to Eat?</h2>
      
      <div className="meal-time-indicator">
        <h3>Current Meal Period: {mealTime}</h3>
      </div>

      <div className="dining-options">
        <div className="option-selector">
          <label>
            <input
              type="radio"
              value="solo"
              checked={selectedOption === 'solo'}
              onChange={(e) => {
                setSelectedOption(e.target.value);
                setSelectedGroup(null);
              }}
            />
            Eating by myself
          </label>

          <label>
            <input
              type="radio"
              value="group"
              checked={selectedOption === 'group'}
              onChange={(e) => setSelectedOption(e.target.value)}
            />
            Eating with a group
          </label>
        </div>

        {selectedOption === 'group' && (
          <div className="group-selector">
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Select a group</option>
              {groups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.name}
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
          Get Recommendation
        </button>
      </div>

      {loading && <div className="loading">Finding the best dining court...</div>}
      
      {error && <div className="error-message">{error}</div>}

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
                {recommendation.confidence > 0 ? (
                  <p className="confidence">Match Score: {recommendation.confidence}%</p>
                ) : (
                  <p className="random-selection">{recommendation.message}</p>
                )}
              </div>
              {recommendation.matchingItems?.length > 0 && (
                <div className="matching-items">
                  <h4>Available Menu Items You'll Love:</h4>
                  <ul>
                    {recommendation.matchingItems.map(item => (
                      <li key={item.name}>
                        {item.name}
                        {item.matchedPreference && (
                          <span className="match-reason">
                            (Matches: {item.matchedPreference})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
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