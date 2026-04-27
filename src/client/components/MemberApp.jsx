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
        if (!currentSession) return undefined;
        // Seed initial details so the UI can render immediately after join.
        setSessionDetails({
            session_status: { value: 'waiting' },
            session_code: { value: currentSession.session_code },
            voting_timer: { value: 30 }
        });
        // Polling is the fallback for environments where AMB record-watcher
        // cannot be subscribed from the BYOUI page (see CabPokerService.subscribeToSession).
        const interval = setInterval(async () => {
            try {
                const sessionData = await service.getSessionSafely(currentSession.session_id);
                if (sessionData) setSessionDetails(sessionData);
            } catch (e) {
                console.warn('Could not refresh session data:', e.message);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [currentSession, service]);

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