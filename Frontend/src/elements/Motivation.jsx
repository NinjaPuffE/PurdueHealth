import React, { useState, useEffect, useRef } from 'react';
import './Motivation.css';

const Motivation = ({ userId, token }) => {
  const [motivation, setMotivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);
  const [macroTargets, setMacroTargets] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch macro targets and dietary data
        const [macrosResponse, dietaryResponse, workoutResponse] = await Promise.all([
          fetch(`https://purduehealth.onrender.com/api/dietary/macros/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://purduehealth.onrender.com/api/dietary/today-meals/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://purduehealth.onrender.com/api/workout-plan/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const [macrosData, dietaryData, workoutData] = await Promise.all([
          macrosResponse.json(),
          dietaryResponse.json(),
          workoutResponse.json()
        ]);

        // Calculate remaining macros
        const consumed = dietaryData.dailyTotals || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        };

        const remaining = {
          calories: Math.max(0, macrosData.calories - (consumed.calories || 0)),
          protein: Math.max(0, macrosData.protein - (consumed.protein || 0)),
          carbs: Math.max(0, macrosData.carbs - (consumed.carbs || 0)),
          fat: Math.max(0, macrosData.fat - (consumed.fat || 0))
        };

        // Get today's workout
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todaysWorkout = workoutData?.schedule?.[today];

        // Generate motivation
        const motivationResponse = await fetch('https://purduehealth.onrender.com/api/motivation/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            macrosLeft: remaining,
            workoutPlan: todaysWorkout
          })
        });

        if (!motivationResponse.ok) {
          throw new Error('Failed to generate motivation');
        }

        const motivationData = await motivationResponse.json();

        setMotivation(motivationData);
        setDailyStats({
          dietary: {
            macrosLeft: remaining,
            macroTargets: macrosData,
            consumed
          },
          workout: todaysWorkout
        });
        setLoading(false);

      } catch (error) {
        console.error('Error fetching motivation data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (userId && token) {
      fetchData();
    }
  }, [userId, token]);

  if (loading) return <div className="motivation-loading">Getting pumped up...</div>;
  if (error) return <div className="motivation-error">Error: {error}</div>;

  return (
    <div className="motivation-container">
      <div className="motivation-video">
        {!videoError ? (
          <video
            ref={videoRef}
            controls
            playsInline
            className="motivation-video-player"
            onError={(e) => {
              console.error('Video error:', e);
              setVideoError(true);
            }}
          >
            <source 
              src={`https://purduehealth.onrender.com/api/motivation/video`}
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="video-error">
            <p>Failed to load motivation video</p>
          </div>
        )}
      </div>

      <div className="motivation-content">
        <h2>Today's Motivation</h2>
        {dailyStats && (
          <div className="daily-summary">
            <h3>Progress Update</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <h4>Workout</h4>
                <p>{dailyStats.workout || 'Rest day'}</p>
              </div>
              <div className="stat-item">
                <h4>Nutrition Goals</h4>
                <p>{dailyStats.dietary.macrosLeft.calories.toFixed(0)} / {dailyStats.dietary.macroTargets.calories} calories remaining</p>
                <p>{dailyStats.dietary.macrosLeft.protein.toFixed(1)}g protein left</p>
              </div>
            </div>
          </div>
        )}
        
        {motivation?.message && (
          <div className="motivation-message">
            <p>{motivation.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Motivation;