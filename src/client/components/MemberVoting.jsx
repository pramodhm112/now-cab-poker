import React, { useState, useEffect } from 'react';

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

    useEffect(() => {
        if (sessionDetails) {
            // Load change request if one is selected
            const changeRequestValue = typeof sessionDetails.change_request === 'object' 
                ? sessionDetails.change_request.value 
                : sessionDetails.change_request;
                
            if (changeRequestValue && changeRequestValue !== 'NULL' && changeRequestValue !== changeRequest?.sys_id) {
                loadChangeRequest(changeRequestValue);
            }

            // Check if voting is active and set up timer
            const sessionStatus = typeof sessionDetails.session_status === 'object' 
                ? sessionDetails.session_status.value 
                : sessionDetails.session_status;

            if (sessionStatus === 'voting') {
                startVotingTimer();
            }
        }
    }, [sessionDetails]);

    const loadChangeRequest = async (changeRequestId) => {
        try {
            const crData = await service.getChangeRequest(changeRequestId);
            setChangeRequest(crData);
        } catch (error) {
            onError('Failed to load change request details');
        }
    };

    const startVotingTimer = () => {
        const votingTimer = typeof sessionDetails.voting_timer === 'object'
            ? parseInt(sessionDetails.voting_timer.value)
            : parseInt(sessionDetails.voting_timer);
        
        setTimeRemaining(votingTimer);
        
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    };

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
                votes.impact, 
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
        
        const status = typeof sessionDetails.session_status === 'object' 
            ? sessionDetails.session_status.value 
            : sessionDetails.session_status;

        switch (status) {
            case 'waiting': return 'Waiting for CAB Chair to start voting';
            case 'voting': return 'Voting in Progress';
            case 'revealing': return 'Votes Revealed - Session Complete';
            case 'completed': return 'Session Completed';
            default: return status;
        }
    };

    const getStatusClass = () => {
        if (!sessionDetails) return 'status-loading';
        
        const status = typeof sessionDetails.session_status === 'object' 
            ? sessionDetails.session_status.value 
            : sessionDetails.session_status;

        return `status-badge status-${status}`;
    };

    const isVotingActive = () => {
        if (!sessionDetails) return false;
        const status = typeof sessionDetails.session_status === 'object' 
            ? sessionDetails.session_status.value 
            : sessionDetails.session_status;
        return status === 'voting';
    };

    const renderChangeRequest = () => {
        if (!changeRequest) return null;
        
        const crNumber = typeof changeRequest.number === 'object' 
            ? changeRequest.number.display_value 
            : changeRequest.number;
        const shortDescription = typeof changeRequest.short_description === 'object' 
            ? changeRequest.short_description.display_value 
            : changeRequest.short_description;
        const description = typeof changeRequest.description === 'object' 
            ? changeRequest.description.display_value 
            : changeRequest.description;
            
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