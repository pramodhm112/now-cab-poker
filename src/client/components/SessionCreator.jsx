import React, { useState } from 'react';

export default function SessionCreator({ service, onSessionCreated, onError, loading, setLoading }) {
    const [votingTimer, setVotingTimer] = useState(30);

    const handleCreateSession = async () => {
        setLoading(true);
        try {
            const session = await service.createSession(votingTimer);
            onSessionCreated(session);
        } catch (error) {
            const errorMessage = (error && error.message) || (error && error.toString()) || 'Unknown error occurred while creating session';
            onError(errorMessage);
        }
        setLoading(false);
    };

    return (
        <div className="session-card">
            <h2>Create New CAB Session</h2>
            <p>Create a new CAB Poker session for collaborative change approval voting.</p>
            
            <div className="form-group">
                <label htmlFor="voting-timer">Voting Timer (seconds):</label>
                <input
                    id="voting-timer"
                    type="number"
                    value={votingTimer}
                    onChange={(e) => setVotingTimer(parseInt(e.target.value) || 30)}
                    min="10"
                    max="300"
                    step="5"
                    disabled={loading}
                />
                <small>Time allowed for voting (10-300 seconds)</small>
            </div>

            <button
                className="primary-button"
                onClick={handleCreateSession}
                disabled={loading}
            >
                {loading ? 'Creating Session...' : 'Create Session'}
            </button>

            <div className="info-panel">
                <h3>How it works:</h3>
                <ul>
                    <li>Create a session and share the generated 6-character code with CAB members</li>
                    <li>Members join using the code from any device</li>
                    <li>Select a change request to review and start voting</li>
                    <li>Members vote on Risk, Impact, and Recommendation</li>
                    <li>Review results and finalize the change assessment</li>
                </ul>
            </div>
        </div>
    );
}