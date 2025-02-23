import React, { useState, useEffect } from 'react';
import './Congestion.css';

const Congestion = () => {
  const [congestionData, setCongestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching with token:', token ? 'Present' : 'Missing');

        const response = await fetch('https://purduehealth.onrender.com/api/congestion', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const text = await response.text(); // Get response as text first
        console.log('Raw response:', text);

        let data;
        try {
          data = JSON.parse(text); // Try to parse as JSON
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          throw new Error('Invalid JSON response from server');
        }

        console.log('Parsed data:', data);
        setCongestionData(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading facility usage data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="congestion-container">
      <h2>CoRec Facility Usage</h2>
      <div className="facility-grid">
        {congestionData?.areas?.map((area) => (
          <div key={area.name} className="facility-card">
            <h3>{area.name}</h3>
            {area.isClosed ? (
              <div className="closed-status">Closed</div>
            ) : (
              <>
                <div className="usage-meter">
                  <div 
                    className="usage-fill"
                    style={{ 
                      width: `${area.occupancyPercentage}%`,
                      backgroundColor: `var(--${area.congestionLevel.toLowerCase()}-color)`
                    }}
                  />
                </div>
                <div className="usage-stats">
                  <span>{area.currentOccupancy} / {area.maxCapacity}</span>
                  <span>{area.occupancyPercentage}% Full</span>
                </div>
                <div className={`congestion-level ${area.congestionLevel.toLowerCase()}`}>
                  {area.congestionLevel}
                </div>
              </>
            )}
            <div className="last-updated">
              Last Updated: {area.lastUpdated}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Congestion;