import React, { useState } from 'react';

export default function SessionJoiner({ service, onSessionJoined, onError, loading, setLoading }) {
    const [sessionCode, setSessionCode] = useState('');

    const handleJoinSession = async () => {
        if (!sessionCode.trim()) {
            onError('Please enter a session code');
            return;
        }

        const code = sessionCode.trim().toUpperCase();
        if (code.length !== 6) {
            onError('Session code must be exactly 6 characters');
            return;
        }

        setLoading(true);
        try {
            console.log('Joining session with code:', code);
            const session = await service.joinSession(code);
            console.log('Successfully joined session:', session);
            onSessionJoined({
                ...session,
                session_code: code
            });
        } catch (error) {
            console.error('Failed to join session:', error);
            const errorMessage = error?.message || error?.toString() || 'Failed to join session';
            onError(errorMessage);
        }
        setLoading(false);
    };

    const handleCodeChange = (e) => {
        // Only allow alphanumeric characters and limit to 6 characters
        const value = e.target.value.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase();
        setSessionCode(value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleJoinSession();
        }
    };

    return (
        <div className="session-joiner">
            <div className="join-card">
                <h2>Join CAB Voting Session</h2>
                <p>Enter the 6-character session code provided by your CAB Chair to join the voting session.</p>
                
                <div className="form-group">
                    <label htmlFor="session-code">Session Code</label>
                    <input
                        id="session-code"
                        type="text"
                        value={sessionCode}
                        onChange={handleCodeChange}
                        onKeyPress={handleKeyPress}
                        placeholder="ABC123"
                        maxLength="6"
                        disabled={loading}
                        className="session-code-input"
                    />
                    <small>Enter the 6-character code (letters and numbers)</small>
                </div>

                <button
                    className="primary-button"
                    onClick={handleJoinSession}
                    disabled={loading || sessionCode.length !== 6}
                >
                    {loading ? 'Joining...' : 'Join Session'}
                </button>

                <div className="info-panel">
                    <h3>What happens next:</h3>
                    <ul>
                        <li>You'll be added to the CAB voting session</li>
                        <li>Wait for the CAB Chair to select a change request</li>
                        <li>When voting starts, you'll see voting cards for Risk, Impact, and Recommendation</li>
                        <li>Submit your votes within the time limit</li>
                        <li>View results when the Chair reveals all votes</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}