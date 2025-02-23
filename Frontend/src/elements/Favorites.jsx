import React, { useState, useEffect } from 'react';
import './Favorites.css';

const Favorites = ({ userId, token }) => {
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/favorites/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch favorites');
        const data = await response.json();
        setFavorites(data);
      } catch (error) {
        setError('Failed to load favorites');
      }
    };

    fetchFavorites();
  }, [userId, token]);

  // Add search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(
          `http://localhost:5000/api/dietary/foods?search=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        setError('Failed to search foods');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, token]);

  const addToFavorites = async (food) => {
    try {
      const response = await fetch('http://localhost:5000/api/favorites/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          foodItem: {
            name: food.name || food.item_name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            servingSize: food.servingSize || food.serving_size,
            diningCourt: 'Purdue Dining'
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add favorite');
      const data = await response.json();
      setFavorites(data);
      setError('Added to favorites successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      setError(error.message);
    }
  };

  const removeFavorite = async (foodName) => {
    try {
      const response = await fetch(`http://localhost:5000/api/favorites/${foodName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to remove favorite');
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      setError('Failed to remove favorite');
    }
  };

  return (
    <div className="favorites-container">
      <h2>My Favorite Foods</h2>
      
      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search foods to add to favorites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        {isSearching && <div className="search-loading">Searching...</div>}
        
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(food => (
              <div key={food._id || food.name} className="food-result-card">
                <div className="food-info">
                  <h3>{food.name || food.item_name}</h3>
                  <p className="serving-size">Serving: {food.servingSize || food.serving_size}</p>
                  <div className="nutrition-info">
                    <span>{food.calories} cal</span>
                    <span>P: {food.protein}g</span>
                    <span>C: {food.carbs}g</span>
                    <span>F: {food.fat}g</span>
                  </div>
                </div>
                <button 
                  onClick={() => addToFavorites(food)}
                  disabled={favorites.some(f => f.name === (food.name || food.item_name))}
                  className="add-favorite-btn"
                >
                  {favorites.some(f => f.name === (food.name || food.item_name)) 
                    ? 'Already in Favorites' 
                    : 'Add to Favorites'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className={error.includes('success') ? 'success-message' : 'error-message'}>
          {error}
        </div>
      )}
      
      {/* Existing Favorites Section */}
      <div className="favorites-grid">
        {favorites.map(food => (
          <div key={food.name} className="favorite-card">
            <div className="favorite-info">
              <h3>{food.name}</h3>
              <p className="serving-size">Serving: {food.servingSize}</p>
              <p className="dining-court">Found at: {food.diningCourt}</p>
              <div className="nutrition-info">
                <span>{food.calories} cal</span>
                <span>P: {food.protein}g</span>
                <span>C: {food.carbs}g</span>
                <span>F: {food.fat}g</span>
              </div>
            </div>
            <button 
              className="remove-favorite"
              onClick={() => removeFavorite(food.name)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      
      {favorites.length === 0 && (
        <p className="no-favorites">No favorite foods added yet</p>
      )}
      
      {favorites.length >= 20 && (
        <p className="limit-reached">
          Favorites limit reached (20 items maximum)
        </p>
      )}
    </div>
  );
};

export default Favorites;