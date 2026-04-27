import React from 'react';
import ReactDOM from 'react-dom/client';
import ChairApp from './components/ChairApp.jsx';

// Using React 18's createRoot API
ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ChairApp />
    </React.StrictMode>
);