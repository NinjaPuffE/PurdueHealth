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
        const response = await fetch(`https://purduehealth.onrender.com/api/favorites/${userId}`, {
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
          `https://purduehealth.onrender.com/api/dietary/foods?search=${encodeURIComponent(searchTerm)}`,
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
      // Format the food item data properly before sending
      const formattedFood = {
        name: food.item_name || food.name,
        servingSize: food.serving_size || food.servingSize || 'Standard Serving',
        calories: food.nutrition?.calories || food.calories || 0,
        protein: food.nutrition?.protein || food.protein || 0,
        carbs: food.nutrition?.carbs || food.carbs || 0,
        fat: food.nutrition?.fat || food.fat || 0,
        diningCourts: food.diningCourts || []
      };

      // Add to favorites
      const response = await fetch('https://purduehealth.onrender.com/api/favorites/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          foodItem: formattedFood
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add favorite');
      }

      const data = await response.json();
      setFavorites(data);
      setError('Added to favorites successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Add to favorites error:', error);
      setError(error.message);
    }
  };

  const removeFavorite = async (foodName) => {
    try {
      const response = await fetch(`https://purduehealth.onrender.com/api/favorites/${foodName}`, {
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
            {searchResults.map(food => {
              const foodId = food._id || `${food.item_name}-${food.dining_court}`;
              const foodName = food.item_name || food.name;
              
              return (
                <div key={foodId} className="food-result-card">
                  <div className="food-info">
                    <h3>{foodName}</h3>
                    <p className="serving-size">
                      Serving: {food.serving_size || food.servingSize || 'Standard Serving'}
                    </p>
                    <div className="nutrition-info">
                      <span>{food.nutrition?.calories || food.calories || 0} cal</span>
                      <span>P: {food.nutrition?.protein || food.protein || 0}g</span>
                      <span>C: {food.nutrition?.carbs || food.carbs || 0}g</span>
                      <span>F: {food.nutrition?.fat || food.fat || 0}g</span>
                    </div>
                    {food.dining_court && (
                      <div className="dining-court-info">
                        <p>Available at: {food.dining_court}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => addToFavorites(food)}
                    disabled={favorites.some(f => f.name === foodName)}
                    className="add-favorite-btn"
                  >
                    {favorites.some(f => f.name === foodName) 
                      ? 'Already in Favorites' 
                      : 'Add to Favorites'}
                  </button>
                </div>
              );
            })}
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
          <div key={`fav-${food.name}`} className="favorite-card">
            <div className="favorite-info">
              <h3>{food.name}</h3>
              <p className="serving-size">
                Serving: {food.servingSize || 'Standard Serving'}
              </p>
              <div className="dining-courts">
                <p>Found at:</p>
                <div className="dining-court-tags">
                  {food.diningCourts?.length > 0 && food.diningCourts[0] !== 'Not currently served' ? (
                    <>
                      {food.diningCourts.map((court, index) => (
                        <span 
                          key={`${food.name}-court-${index}`} 
                          className="dining-court-tag"
                          title={food.historicallyServedAt?.includes(court) ? 
                            "This item has been served here before" : 
                            "This item is currently on the menu here"}
                        >
                          {court}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="dining-court-tag not-served">
                      Not currently served
                    </span>
                  )}
                </div>
              </div>
              <div className="nutrition-info">
                <span>{food.calories || 0} cal</span>
                <span>P: {food.protein || 0}g</span>
                <span>C: {food.carbs || 0}g</span>
                <span>F: {food.fat || 0}g</span>
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