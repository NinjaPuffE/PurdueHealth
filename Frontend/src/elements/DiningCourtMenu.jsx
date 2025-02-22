import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectItem } from '@/components/ui/Select';

const DiningCourtMenu = () => {
    const [diningCourts, setDiningCourts] = useState(["Hillenbrand", "Earhart", "Ford", "Wiley", "Windsor"]);
    const [times, setTimes] = useState(["Breakfast", "Lunch", "Dinner", "Brunch", "Late Lunch"]);
    const [selectedCourt, setSelectedCourt] = useState(diningCourts[0]);
    const [selectedTime, setSelectedTime] = useState(times[0]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [menuData, setMenuData] = useState([]);

    useEffect(() => {
        fetchMenuData();
    }, [selectedCourt, selectedTime, selectedDate]);

    const fetchMenuData = async () => {
        try {
            const response = await fetch(`/api/menu?dining_court=${selectedCourt}&date=${selectedDate}&meal=${selectedTime}`);
            const data = await response.json();
            setMenuData(data);
        } catch (error) {
            console.error('Failed to fetch menu data', error);
        }
    };

    return (
        <div className="p-4">
            <div className="flex space-x-4 mb-4">
                <Select value={selectedCourt} onChange={e => setSelectedCourt(e.target.value)}>
                    {diningCourts.map(court => <SelectItem key={court} value={court}>{court}</SelectItem>)}
                </Select>
                <Select value={selectedTime} onChange={e => setSelectedTime(e.target.value)}>
                    {times.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                </Select>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded p-2" />
                <Button onClick={fetchMenuData}>Refresh</Button>
            </div>
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
    );
};

export default DiningCourtMenu;
