import React from 'react';
import ReactDOM from 'react-dom/client';
import MemberApp from './components/MemberApp.jsx';

// Using React 18's createRoot API
ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <MemberApp />
    </React.StrictMode>
);