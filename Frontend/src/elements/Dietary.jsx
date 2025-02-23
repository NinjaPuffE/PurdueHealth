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
  const [savedMeals, setSavedMeals] = useState([]);
  const [todaysMeals, setTodaysMeals] = useState(null);

  // Fetch user's recommended macros
  useEffect(() => {
    const fetchMacros = async () => {
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
        // Set default macros if fetch fails
        setMacros({
          calories: 2000,
          protein: 150,
          fat: 67,
          carbs: 250
        });
      }
    };

    fetchMacros();
  }, [userId, token]);

  // Improved search effect
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setFoodItems([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        setSearchError(null);
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
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Found foods:', data);
        setFoodItems(data);
      } catch (error) {
        console.error('Error searching foods:', error);
        setSearchError(error.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, token]);

  // Add this useEffect to load today's meals
  useEffect(() => {
    const fetchTodaysMeals = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/dietary/today-meals/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch today\'s meals');
        }

        const data = await response.json();
        setTodaysMeals(data);
        setSelectedFoods(data.foods || []);
        setDailyTotal(data.dailyTotals || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
      } catch (error) {
        console.error('Error fetching today\'s meals:', error);
      }
    };

    if (userId && token) {
      fetchTodaysMeals();
    }
  }, [userId, token]);

  // Update the addFood function
  const addFood = async (food, servings) => {
    try {
      const newFood = {
        ...food,
        servings,
        totalCalories: food.calories * servings,
        totalProtein: food.protein * servings,
        totalCarbs: food.carbs * servings,
        totalFat: food.fat * servings
      };

      const response = await fetch('http://localhost:5000/api/dietary/add-food', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          food: newFood
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add food');
      }

      const updatedMeals = await response.json();
      setTodaysMeals(updatedMeals);
      setSelectedFoods(updatedMeals.foods);
      setDailyTotal(updatedMeals.dailyTotals);

    } catch (error) {
      console.error('Error adding food:', error);
    }
  };

  const updateDailyTotals = (foods) => {
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + (food.totalCalories || 0),
      protein: acc.protein + (food.totalProtein || 0),
      carbs: acc.carbs + (food.totalCarbs || 0),
      fat: acc.fat + (food.totalFat || 0)
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });

    setDailyTotal(totals);
  };

  const saveMeal = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dietary/meals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          date: new Date().toISOString(),
          foods: selectedFoods,
          totals: dailyTotal
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save meal');
      }

      // Clear selected foods and reset totals
      setSelectedFoods([]);
      setDailyTotal({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const removeFood = async (foodId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/dietary/remove-food/${userId}/${foodId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove food');
      }

      const updatedMeals = await response.json();
      setSelectedFoods(updatedMeals.foods);
      setDailyTotal(updatedMeals.dailyTotals);

    } catch (error) {
      console.error('Error removing food:', error);
    }
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
                <div className="food-actions">
                  <div className="servings-input">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      defaultValue="1"
                      className="serving-amount"
                      onChange={(e) => {
                        const servings = parseFloat(e.target.value);
                        if (!isNaN(servings) && servings > 0) {
                          e.target.dataset.servings = servings;
                        }
                      }}
                    />
                    <span>servings</span>
                  </div>
                  <button 
                    className="add-food-btn"
                    onClick={(e) => {
                      const servings = parseFloat(e.target.closest('.food-item').querySelector('.serving-amount').dataset.servings || '1');
                      addFood(food, servings);
                    }}
                  >
                    Add Food
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {searchTerm.length >= 2 && !isSearching && foodItems.length === 0 && (
          <div className="no-results">No foods found matching "{searchTerm}"</div>
        )}
      </div>
      <div className="selected-foods-container">
        <h2>Today's Foods</h2>
        {selectedFoods.length > 0 ? (
          <div className="selected-foods-list">
            {selectedFoods.map((food) => (
              <div key={food._id} className="selected-food-item">
                <div className="food-info">
                  <h4>{food.name}</h4>
                  <p>{food.servings} serving(s)</p>
                  <p className="nutrition-info">
                    {food.totalCalories.toFixed(0)} cal | 
                    P: {food.totalProtein.toFixed(1)}g | 
                    C: {food.totalCarbs.toFixed(1)}g | 
                    F: {food.totalFat.toFixed(1)}g
                  </p>
                </div>
                <button 
                  className="remove-food"
                  onClick={() => removeFood(food._id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="daily-total">
              <h3>Daily Total</h3>
              <p>
                {dailyTotal.calories.toFixed(0)} cal | 
                P: {dailyTotal.protein.toFixed(1)}g | 
                C: {dailyTotal.carbs.toFixed(1)}g | 
                F: {dailyTotal.fat.toFixed(1)}g
              </p>
            </div>
          </div>
        ) : (
          <p className="no-foods">No foods added today</p>
        )}
      </div>
    </div>
  );
};

export default Dietary;