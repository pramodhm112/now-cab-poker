import React, { useState, useEffect } from 'react';

const readField = (rec, key) => {
    if (!rec) return undefined;
    const v = rec[key];
    if (v && typeof v === 'object') return v.value !== undefined ? v.value : v.display_value;
    return v;
};

export default function MemberVoting({ service, session, sessionDetails, onError, onVoteSubmitted }) {
    const [votes, setVotes] = useState({
        risk: '',
        impact: '',
        recommendation: ''
    });
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [changeRequest, setChangeRequest] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    // Load change request whenever the session points to a (different) one.
    useEffect(() => {
        const changeRequestValue = readField(sessionDetails, 'change_request');
        if (changeRequestValue && changeRequestValue !== 'NULL' && changeRequestValue !== '' &&
            changeRequestValue !== (changeRequest && changeRequest.sys_id)) {
            service.getChangeRequest(changeRequestValue)
                .then(setChangeRequest)
                .catch(() => onError('Failed to load change request details'));
        }
    }, [sessionDetails, service]);

    // Reset hasVoted whenever a new voting round starts (status -> 'voting' with a new start time).
    const sessionStatus = readField(sessionDetails, 'session_status');
    const votingStartTime = readField(sessionDetails, 'voting_start_time');
    useEffect(() => {
        if (sessionStatus === 'voting') {
            setHasVoted(false);
            setVotes({ risk: '', impact: '', recommendation: '' });
        }
    }, [sessionStatus, votingStartTime]);

    // Run the countdown timer while voting is active. Cleanup is owned by useEffect.
    useEffect(() => {
        if (sessionStatus !== 'voting') {
            setTimeRemaining(null);
            return undefined;
        }
        const total = parseInt(readField(sessionDetails, 'voting_timer'), 10) || 30;
        let remaining = total;
        if (votingStartTime) {
            const elapsed = Math.floor((Date.now() - new Date(votingStartTime).getTime()) / 1000);
            remaining = Math.max(0, total - elapsed);
        }
        setTimeRemaining(remaining);
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionStatus, votingStartTime, sessionDetails]);

    const handleVoteChange = (category, value) => {
        setVotes(prev => ({
            ...prev,
            [category]: value
        }));
    };

    const handleSubmitVote = async () => {
        if (!votes.risk || !votes.impact || !votes.recommendation) {
            onError('Please make selections for Risk, Impact, and Recommendation');
            return;
        }

        setLoading(true);
        try {
            await service.submitVote(
                session.session_id,
                votes.risk,
                parseInt(votes.impact, 10),
                votes.recommendation
            );
            setHasVoted(true);
            onVoteSubmitted();
        } catch (error) {
            onError('Failed to submit vote: ' + error.message);
        }
        setLoading(false);
    };

    const getStatusDisplay = () => {
        if (!sessionDetails) return 'Loading...';
        switch (sessionStatus) {
            case 'waiting': return 'Waiting for CAB Chair to start voting';
            case 'voting': return 'Voting in Progress';
            case 'revealing': return 'Votes Revealed - Session Complete';
            case 'completed': return 'Session Completed';
            default: return sessionStatus;
        }
    };

    const getStatusClass = () => {
        if (!sessionDetails) return 'status-loading';
        return `status-badge status-${sessionStatus}`;
    };

    const isVotingActive = () => sessionStatus === 'voting';

    const renderChangeRequest = () => {
        if (!changeRequest) return null;
        const crNumber = readField(changeRequest, 'number');
        const shortDescription = readField(changeRequest, 'short_description');
        const description = readField(changeRequest, 'description');
        return (
            <div className="change-request-card">
                <h3>Change Request Under Review</h3>
                <div className="cr-info">
                    <div className="cr-header">
                        <strong>{crNumber}</strong> - {shortDescription}
                    </div>
                    {description && (
                        <div className="cr-description">
                            <p>{description}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderVotingCards = () => {
        if (!isVotingActive() || hasVoted) return null;

        return (
            <div className="voting-cards">
                <h3>Cast Your Votes</h3>
                {timeRemaining !== null && (
                    <div className="voting-timer">
                        <span className="timer-display">
                            ⏰ Time Remaining: <strong>{timeRemaining}s</strong>
                        </span>
                    </div>
                )}

                <div className="vote-categories">
                    {/* Risk Vote */}
                    <div className="vote-category">
                        <h4>Risk Assessment</h4>
                        <div className="vote-options">
                            {[
                                { value: 'low', label: 'Low', color: 'green' },
                                { value: 'medium', label: 'Medium', color: 'yellow' },
                                { value: 'high', label: 'High', color: 'orange' },
                                { value: 'critical', label: 'Critical', color: 'red' }
                            ].map(option => (
                                <label key={option.value} className={`vote-option risk-${option.color}`}>
                                    <input
                                        type="radio"
                                        name="risk"
                                        value={option.value}
                                        checked={votes.risk === option.value}
                                        onChange={(e) => handleVoteChange('risk', e.target.value)}
                                        disabled={loading}
                                    />
                                    <span className="option-label">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Impact Vote */}
                    <div className="vote-category">
                        <h4>Impact Rating</h4>
                        <div className="vote-options">
                            {[1, 2, 3, 4, 5].map(rating => (
                                <label key={rating} className="vote-option impact-option">
                                    <input
                                        type="radio"
                                        name="impact"
                                        value={rating}
                                        checked={votes.impact === String(rating)}
                                        onChange={(e) => handleVoteChange('impact', e.target.value)}
                                        disabled={loading}
                                    />
                                    <span className="option-label">Impact {rating}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Recommendation Vote */}
                    <div className="vote-category">
                        <h4>Recommendation</h4>
                        <div className="vote-options">
                            {[
                                { value: 'approve', label: 'Approve', color: 'green' },
                                { value: 'approve_conditions', label: 'Approve with Conditions', color: 'yellow' },
                                { value: 'reject', label: 'Reject', color: 'red' },
                                { value: 'defer', label: 'Defer', color: 'gray' }
                            ].map(option => (
                                <label key={option.value} className={`vote-option rec-${option.color}`}>
                                    <input
                                        type="radio"
                                        name="recommendation"
                                        value={option.value}
                                        checked={votes.recommendation === option.value}
                                        onChange={(e) => handleVoteChange('recommendation', e.target.value)}
                                        disabled={loading}
                                    />
                                    <span className="option-label">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="vote-actions">
                    <button
                        className="primary-button submit-vote-button"
                        onClick={handleSubmitVote}
                        disabled={loading || !votes.risk || !votes.impact || !votes.recommendation}
                    >
                        {loading ? 'Submitting...' : 'Submit Votes'}
                    </button>
                </div>
            </div>
        );
    };

    const renderVoteConfirmation = () => {
        if (!hasVoted) return null;

        return (
            <div className="vote-confirmation">
                <div className="confirmation-card">
                    <h3>✓ Vote Submitted Successfully</h3>
                    <p>Your votes have been recorded. Wait for the CAB Chair to reveal all results.</p>
                    
                    <div className="your-votes">
                        <h4>Your Votes:</h4>
                        <div className="vote-summary">
                            <span><strong>Risk:</strong> {votes.risk.charAt(0).toUpperCase() + votes.risk.slice(1)}</span>
                            <span><strong>Impact:</strong> {votes.impact}</span>
                            <span><strong>Recommendation:</strong> {votes.recommendation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="member-voting">
            <div className="session-status">
                <h2>CAB Voting Session</h2>
                <div className="status-info">
                    <span className={getStatusClass()}>
                        {getStatusDisplay()}
                    </span>
                </div>
            </div>

            {renderChangeRequest()}
            {renderVotingCards()}
            {renderVoteConfirmation()}

            {!isVotingActive() && !hasVoted && !changeRequest && (
                <div className="waiting-message">
                    <div className="waiting-card">
                        <h3>Waiting for Session to Begin</h3>
                        <p>The CAB Chair will select a change request and start the voting process shortly.</p>
                        <div className="loading-spinner">⏳</div>
                    </div>
                </div>
            )}
        </div>
    );
}