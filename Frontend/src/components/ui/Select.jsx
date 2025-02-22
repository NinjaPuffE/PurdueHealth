import React from 'react';

export const Select = ({ children, value, onChange, className }) => {
    return (
        <select className={`select ${className}`} value={value} onChange={onChange}>
            {children}
        </select>
    );
};

export const SelectItem = ({ children, value }) => {
    return (
        <option value={value}>
            {children}
        </option>
    );
};
