import React, { useState } from 'react';

export default function SessionCreator({ service, onSessionCreated, onError, loading, setLoading }) {
    const [votingTimer, setVotingTimer] = useState(30);

    const handleCreateSession = async () => {
        setLoading(true);
        try {
            console.log('Creating session with timer:', votingTimer);
            
            let session;
            
            // Try the normal JSON body method first
            try {
                session = await service.createSession(votingTimer);
                console.log('Session created successfully with JSON body:', session);
            } catch (firstError) {
                console.warn('First method failed, trying alternative:', firstError.message);
                
                // If that fails, try the query parameter method
                try {
                    session = await service.createSessionWithQueryParams(votingTimer);
                    console.log('Session created successfully with query params:', session);
                } catch (secondError) {
                    console.error('Both methods failed:', secondError.message);
                    throw firstError; // Throw the original error
                }
            }
            
            onSessionCreated(session);
        } catch (error) {
            console.error('Session creation failed:', error);
            // Ensure we always pass a string message
            const errorMessage = error?.message || error?.toString() || 'Unknown error occurred while creating session';
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
            
            <div className="debug-info" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '12px' }}>
                <h4>Debug Information:</h4>
                <p><strong>User Token:</strong> {window.g_ck ? 'Present' : 'Missing'}</p>
                <p><strong>API URL:</strong> /api/x_1862662_cab_poke/cab_poker/session</p>
                <p><strong>Method:</strong> POST with JSON body</p>
                <p><strong>Payload:</strong> {JSON.stringify({ voting_timer: votingTimer })}</p>
            </div>
        </div>
    );
}