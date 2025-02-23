import React from 'react';
import './App.css';

const Home = () => {
  return (
    <div className="home-container">
      <section className="welcome-section">
        <div className="background-shape shape1"></div>
        <div className="background-shape shape2"></div>
        <div className="background-shape shape3"></div>
        <h1 className="welcome-title">Welcome to Purdue Health</h1>
        <p className="welcome-subtitle">Your personal health and fitness companion at Purdue</p>
      </section>

      <div className="features-grid">
        <div className="feature-card">
          <h3>Dining Court Menu</h3>
          <p>Access real-time dining court menus and nutritional information for all meals.</p>
        </div>
        <div className="feature-card">
          <h3>Workout Plans</h3>
          <p>Get personalized workout plans based on your fitness goals and schedule.</p>
        </div>
        <div className="feature-card">
          <h3>Dietary Tracking</h3>
          <p>Track your daily nutrition and stay on top of your dietary goals.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;