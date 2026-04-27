import React, { useState, useMemo } from 'react';
import { CabPokerService } from '../services/CabPokerService.js';
import SessionCreator from './SessionCreator.jsx';
import SessionDashboard from './SessionDashboard.jsx';
import './ChairApp.css';

export default function ChairApp() {
    const service = useMemo(() => new CabPokerService(), []);
    const [currentSession, setCurrentSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSessionCreated = (session) => {
        setCurrentSession(session);
        setError('');
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setLoading(false);
    };

    const handleBackToHome = () => {
        setCurrentSession(null);
        setError('');
    };

    return (
        <div className="chair-app">
            <header className="chair-header">
                <h1>CAB Poker - Chair Dashboard</h1>
                {currentSession && (
                    <button 
                        className="back-button" 
                        onClick={handleBackToHome}
                    >
                        ← Back to Home
                    </button>
                )}
            </header>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError('')}>Dismiss</button>
                </div>
            )}

            <main className="chair-main">
                {!currentSession ? (
                    <SessionCreator
                        service={service}
                        onSessionCreated={handleSessionCreated}
                        onError={handleError}
                        loading={loading}
                        setLoading={setLoading}
                    />
                ) : (
                    <SessionDashboard
                        service={service}
                        session={currentSession}
                        onError={handleError}
                    />
                )}
            </main>
        </div>
    );
}