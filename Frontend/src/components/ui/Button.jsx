import React from 'react';

export const Button = ({ children, onClick, className }) => {
    return (
        <button className={`button ${className}`} onClick={onClick}>
            {children}
        </button>
    );
};
