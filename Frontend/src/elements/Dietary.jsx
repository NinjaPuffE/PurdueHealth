import React, { useState, useEffect } from 'react';
import './Dietary.css';

const Dietary = ({ userId, token, surveyData }) => {
  const [macros, setMacros] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyTotal, setDailyTotal] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Fetch user's recommended macros
  useEffect(() => {
    const fetchMacros = async () => {
      if (!userId || !token) return;

      try {
        console.log('Fetching macros for user:', userId);
        const response = await fetch(`http://localhost:5000/api/dietary/macros/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch macros');
        }

        const data = await response.json();
        console.log('Received macros:', data);
        setMacros(data);
      } catch (error) {
        console.error('Error fetching macros:', error);
      }
    };

    fetchMacros();
  }, [userId, token]);

  // Update the search effect
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setFoodItems([]);
        return;
      }

      try {
        setIsSearching(true);
        console.log('Searching foods:', searchTerm);
        const response = await fetch(
          `http://localhost:5000/api/dietary/foods?search=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch foods');
        }

        const data = await response.json();
        console.log('Found foods:', data);
        setFoodItems(data);
        setIsSearching(false);
      } catch (error) {
        console.error('Error searching foods:', error);
        setSearchError('Failed to fetch foods');
        setIsSearching(false);
      }
    }, 300); // Reduced debounce delay for better responsiveness

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, token]);

  const addFood = (food, servings) => {
    const newFood = {
      ...food,
      servings,
      totalCalories: food.calories * servings,
      totalProtein: food.protein * servings,
      totalCarbs: food.carbs * servings,
      totalFat: food.fat * servings
    };

    setSelectedFoods(prev => [...prev, newFood]);
    updateDailyTotals([...selectedFoods, newFood]);
  };

  const updateDailyTotals = (foods) => {
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + food.totalCalories,
      protein: acc.protein + food.totalProtein,
      carbs: acc.carbs + food.totalCarbs,
      fat: acc.fat + food.totalFat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setDailyTotal(totals);
  };

  return (
    <div className="dietary-container">
      <div className="macros-summary">
        <h2>Daily Targets</h2>
        {macros && (
          <div className="macros-grid">
            <div className="macro-item">
              <h3>Calories</h3>
              <p>{dailyTotal.calories} / {macros.calories}</p>
            </div>
            <div className="macro-item">
              <h3>Protein</h3>
              <p>{dailyTotal.protein}g / {macros.protein}g</p>
            </div>
            <div className="macro-item">
              <h3>Carbs</h3>
              <p>{dailyTotal.carbs}g / {macros.carbs}g</p>
            </div>
            <div className="macro-item">
              <h3>Fat</h3>
              <p>{dailyTotal.fat}g / {macros.fat}g</p>
            </div>
          </div>
        )}
      </div>

      <div className="food-search">
        <input
          type="text"
          placeholder="Search by item name (e.g., 'Western Quiche')..."
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            setSearchError(null);
            console.log('Searching for:', value);
          }}
        />
        {isSearching && <div className="search-loading">Searching...</div>}
        {searchError && <div className="search-error">{searchError}</div>}
        {foodItems.length > 0 && (
          <div className="food-results">
            {foodItems.map(food => (
              <div key={food._id} className="food-item">
                <h4>{food.name}</h4>
                <p className="serving-size">Serving: {food.servingSize}</p>
                <p className="nutrition-info">
                  {food.calories} cal | P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                </p>
                {food.details && (
                  <p className="nutrition-details">
                    Sugar: {food.details.sugar} | Fiber: {food.details.fiber}
                  </p>
                )}
                <div className="servings-control">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    defaultValue="1"
                    onChange={(e) => {
                      const servings = parseFloat(e.target.value);
                      if (!isNaN(servings) && servings > 0) {
                        addFood(food, servings);
                      }
                    }}
                  />
                  <span>servings</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {searchTerm.length >= 2 && !isSearching && foodItems.length === 0 && (
          <div className="no-results">No foods found matching "{searchTerm}"</div>
        )}
      </div>
    </div>
  );
};

export default Dietary;