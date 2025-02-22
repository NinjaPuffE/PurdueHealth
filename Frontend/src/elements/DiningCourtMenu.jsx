import React, { useEffect, useState } from 'react';
import './DiningCourtMenu.css';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, SelectItem } from '../components/ui/Select';

const DiningCourtMenu = () => {
    const [diningCourts, setDiningCourts] = useState(["Hillenbrand", "Earhart", "Ford", "Wiley", "Windsor"]);
    //const [times, setTimes] = useState(["Breakfast", "Lunch", "Dinner", "Brunch", "Late Lunch"]);
    const [selectedCourt, setSelectedCourt] = useState(diningCourts[0]);
    //const [selectedTime, setSelectedTime] = useState(times[0]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMenuData();
    }, [selectedCourt, selectedDate]);

    const fetchMenuData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(`Fetching menu data for court: ${selectedCourt}, date: ${selectedDate}`);
            const response = await fetch(`http://localhost:5000/api/menu/getMenus?dining_court=${selectedCourt}&date=${selectedDate}`);
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const menuItems = await response.json();
            console.log('Menu items fetched:', menuItems);
            setMenuData(menuItems);
        } catch (error) {
            console.error('Failed to fetch menu data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                {loading && <p>Loading...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && !error && menuData.length === 0 && <p>No menu data available</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuData.map((station, index) => (
                        <Card key={index} className="bg-white shadow-md">
                            <CardContent>
                                <h2 className="text-xl font-bold mb-2">{station.station}</h2>
                                {station.items.map((item, idx) => (
                                    <div key={idx} className="mb-2">
                                        <h3 className="text-lg font-semibold">{item.item_name}</h3>
                                        <p>{item.dietary_tags.join(', ')}</p>
                                        {item.nutrition && (
                                            <p>Calories: {item.nutrition.calories}</p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiningCourtMenu;