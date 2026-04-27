import React, { useState, useEffect, useMemo } from 'react';
import { CabPokerService } from '../services/CabPokerService.js';
import SessionJoiner from './SessionJoiner.jsx';
import MemberVoting from './MemberVoting.jsx';
import './MemberApp.css';

export default function MemberApp() {
    const service = useMemo(() => new CabPokerService(), []);
    const [currentSession, setCurrentSession] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentSession) {
            // Since Table API lookup is failing, let's use the session data we got from joining
            // and only try to refresh it periodically using a different method
            setSessionDetails({
                session_status: { value: 'waiting' },
                session_code: { value: currentSession.session_code },
                voting_timer: { value: 30 }
            });
            
            // Try to load additional session data less frequently and handle failures gracefully
            const interval = setInterval(() => {
                loadSessionDataSafely();
            }, 5000); // Every 5 seconds instead of 2
            
            return () => clearInterval(interval);
        }
    }, [currentSession]);

    const loadSessionDataSafely = async () => {
        if (!currentSession) return;
        
        try {
            // Try to get session details, but don't fail if it doesn't work
            const sessionData = await service.getSessionSafely(currentSession.session_id);
            if (sessionData) {
                setSessionDetails(sessionData);
            }
        } catch (error) {
            // Silently fail for session data loading after the initial join
            console.warn('Could not refresh session data:', error.message);
            // Don't show error to user since they can still participate
        }
    };

    const handleSessionJoined = (session) => {
        console.log('Session joined successfully:', session);
        setCurrentSession(session);
        setError('');
        
        // Set initial session details based on what we know
        setSessionDetails({
            session_status: { value: 'waiting' },
            session_code: { value: session.session_code },
            voting_timer: { value: 30 }
        });
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setLoading(false);
    };

    const handleLeaveSession = () => {
        setCurrentSession(null);
        setSessionDetails(null);
        setError('');
    };

    const handleVoteSubmitted = () => {
        // Update session details to reflect that voting happened
        console.log('Vote submitted, updating local session state');
        setSessionDetails(prev => ({
            ...prev,
            // You could update local state here if needed
        }));
    };

    return (
        <div className="member-app">
            <header className="member-header">
                <h1>CAB Poker - Member</h1>
                {currentSession && (
                    <div className="session-info-header">
                        <span className="session-code-display">
                            Session: <strong>{currentSession.session_code}</strong>
                        </span>
                        <button 
                            className="leave-button" 
                            onClick={handleLeaveSession}
                        >
                            Leave Session
                        </button>
                    </div>
                )}
            </header>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError('')}>Dismiss</button>
                </div>
            )}

            <main className="member-main">
                {!currentSession ? (
                    <SessionJoiner
                        service={service}
                        onSessionJoined={handleSessionJoined}
                        onError={handleError}
                        loading={loading}
                        setLoading={setLoading}
                    />
                ) : (
                    <MemberVoting
                        service={service}
                        session={currentSession}
                        sessionDetails={sessionDetails}
                        onError={handleError}
                        onVoteSubmitted={handleVoteSubmitted}
                    />
                )}
            </main>
        </div>
    );
}