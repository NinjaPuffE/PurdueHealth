import React, { useEffect, useState } from 'react';
import './DiningCourtMenu.css';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, SelectItem } from '../components/ui/Select';

const DiningCourtMenu = () => {
    const [diningCourts, setDiningCourts] = useState(["Hillenbrand", "Earhart", "Ford", "Wiley", "Windsor"]);
    const [selectedCourt, setSelectedCourt] = useState(diningCourts[0]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null); // State to track the selected item

    useEffect(() => {
        fetchMenuData();
    }, [selectedCourt, selectedDate]);

    const fetchMenuData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://purduehealth.onrender.com/api/menu/getMenus?dining_court=${selectedCourt}&date=${selectedDate}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const menuItems = await response.json();
            setMenuData(menuItems);
        } catch (error) {
            console.error('Failed to fetch menu data:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleBack = () => {
        setSelectedItem(null);
    };

    if (selectedItem) {
        return (
            <div className="dining-court-menu-container">
                <div className="p-4">
                    <Button onClick={handleBack} className="back-button">Back to Menu</Button>
                    <Card className="detailed-view">
                        <CardContent>
                            <h2>{selectedItem.item_name}</h2>
                            <p><strong>Calories:</strong> {selectedItem.nutrition.calories}</p>
                            <p><strong>Protein:</strong> {selectedItem.nutrition.protein}</p>
                            <p><strong>Total Fat:</strong> {selectedItem.nutrition.total_fat}</p>
                            <p><strong>Saturated Fat:</strong> {selectedItem.nutrition.saturated_fat}</p>
                            <p><strong>Cholesterol:</strong> {selectedItem.nutrition.cholesterol}</p>
                            <p><strong>Sodium:</strong> {selectedItem.nutrition.sodium}</p>
                            <p><strong>Total Carbohydrate:</strong> {selectedItem.nutrition.total_carbohydrate}</p>
                            <p><strong>Dietary Fiber:</strong> {selectedItem.nutrition.dietary_fiber}</p>
                            <p><strong>Sugar:</strong> {selectedItem.nutrition.sugar}</p>
                            <p><strong>Added Sugar:</strong> {selectedItem.nutrition.added_sugar}</p>
                            <p><strong>Calcium:</strong> {selectedItem.nutrition.calcium}</p>
                            <p><strong>Iron:</strong> {selectedItem.nutrition.iron}</p>
                            <p><strong>Serving Size:</strong> {selectedItem.nutrition.serving_size}</p>
                            <p><strong>Ingredients:</strong> {selectedItem.nutrition.ingredients}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="dining-court-menu-container">
            <div className="p-4">
                <div className="flex space-x-4 mb-4">
                    <Select value={selectedCourt} onChange={e => setSelectedCourt(e.target.value)}>
                        {diningCourts.map(court => <SelectItem key={court} value={court}>{court}</SelectItem>)}
                    </Select>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded p-2" />
                    <Button onClick={fetchMenuData}>Refresh</Button>
                </div>
                {loading && <p className="loading">Loading...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && !error && menuData.length === 0 && <p className="no-data">No menu data available</p>}
                <div className="menu-grid">
                    {menuData.map((station, index) => (
                        <Card key={index} className="menu-card">
                            <CardContent>
                                <h2>{station.station}</h2>
                                <div className="menu-items">
                                    {station.items.map((item, idx) => (
                                        <div key={idx} className="menu-item" onClick={() => handleItemClick(item)}>
                                            <h3>{item.item_name}</h3>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiningCourtMenu;