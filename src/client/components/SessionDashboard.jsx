import React, { useState, useEffect } from 'react';

export default function SessionDashboard({ service, session, onError }) {
    const [sessionDetails, setSessionDetails] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [changeRequest, setChangeRequest] = useState(null);
    const [votingResults, setVotingResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [changeRequestId, setChangeRequestId] = useState('');
    const [showCRSelector, setShowCRSelector] = useState(false);
    const [crSearchMode, setCrSearchMode] = useState('dropdown'); // 'sysid', 'number', or 'dropdown'
    const [changeRequestNumber, setChangeRequestNumber] = useState('');
    const [availableChangeRequests, setAvailableChangeRequests] = useState([]);
    const [selectedCrFromDropdown, setSelectedCrFromDropdown] = useState('');

    useEffect(() => {
        loadSessionData();
        const interval = setInterval(loadSessionData, 3000); // Refresh every 3 seconds
        return () => clearInterval(interval);
    }, [session.session_id]);

    useEffect(() => {
        // Load available change requests when selector is shown
        if (showCRSelector && crSearchMode === 'dropdown') {
            loadAvailableChangeRequests();
        }
    }, [showCRSelector, crSearchMode]);

    const loadSessionData = async () => {
        try {
            const [sessionData, participantsData] = await Promise.all([
                service.getSession(session.session_id).catch(() => null), // Don't fail if this fails
                service.getParticipants(session.session_id).catch(() => []) // Return empty array if fails
            ]);
            
            if (sessionData) {
                setSessionDetails(sessionData);

                // Load change request if one is selected
                const changeRequestValue = typeof sessionData.change_request === 'object' 
                    ? sessionData.change_request.value 
                    : sessionData.change_request;
                    
                if (changeRequestValue && changeRequestValue !== 'NULL' && changeRequestValue !== '' && changeRequestValue !== changeRequest?.sys_id) {
                    try {
                        const crData = await service.getChangeRequest(changeRequestValue);
                        setChangeRequest(crData);
                    } catch (error) {
                        console.warn('Could not load change request:', error.message);
                    }
                }
            }
            
            setParticipants(participantsData || []);
        } catch (error) {
            onError('Failed to load session data: ' + error.message);
        }
    };

    const loadAvailableChangeRequests = async () => {
        try {
            const crs = await service.getAvailableChangeRequests();
            setAvailableChangeRequests(crs);
        } catch (error) {
            console.error('Could not load available change requests:', error);
            setAvailableChangeRequests([]);
        }
    };

    const handleSelectChangeRequest = async () => {
        if (crSearchMode === 'dropdown') {
            if (!selectedCrFromDropdown) {
                onError('Please select a change request from the dropdown');
                return;
            }
            
            const selectedCr = availableChangeRequests.find(cr => {
                const sysId = typeof cr.sys_id === 'object' ? cr.sys_id.value : cr.sys_id;
                return sysId === selectedCrFromDropdown;
            });
            
            if (selectedCr) {
                setChangeRequest(selectedCr);
                setShowCRSelector(false);
                setSelectedCrFromDropdown('');
            } else {
                onError('Selected change request not found');
            }
            return;
        }
        
        if (crSearchMode === 'sysid') {
            if (!changeRequestId.trim()) {
                onError('Please enter a Change Request sys_id');
                return;
            }
            
            const cleanId = changeRequestId.trim();
            
            // Validate sys_id format (32-character hexadecimal)
            if (!/^[a-fA-F0-9]{32}$/.test(cleanId)) {
                onError('Invalid sys_id format. ServiceNow sys_id should be 32 characters of letters and numbers.');
                return;
            }
            
            setLoading(true);
            try {
                const crData = await service.getChangeRequest(cleanId);
                setChangeRequest(crData);
                setShowCRSelector(false);
                setChangeRequestId('');
            } catch (error) {
                onError('Failed to load change request: ' + error.message);
            }
            setLoading(false);
        } else {
            // Search by number
            if (!changeRequestNumber.trim()) {
                onError('Please enter a Change Request number');
                return;
            }
            
            setLoading(true);
            try {
                const crData = await service.searchChangeRequestByNumber(changeRequestNumber.trim());
                setChangeRequest(crData);
                setShowCRSelector(false);
                setChangeRequestNumber('');
            } catch (error) {
                onError('Failed to find change request: ' + error.message);
            }
            setLoading(false);
        }
    };

    const handleStartVoting = async () => {
        if (!changeRequest) {
            onError('Please select a change request first');
            return;
        }
        
        setLoading(true);
        try {
            const crSysId = typeof changeRequest.sys_id === 'object' 
                ? changeRequest.sys_id.value 
                : changeRequest.sys_id;
                
            console.log('Starting voting with change request sys_id:', crSysId);
            
            await service.startVoting(session.session_id, crSysId);
            // Refresh session data to get updated status
            await loadSessionData();
        } catch (error) {
            onError('Failed to start voting: ' + error.message);
        }
        setLoading(false);
    };

    const handleRevealVotes = async () => {
        setLoading(true);
        try {
            const results = await service.revealVotes(session.session_id);
            setVotingResults(results);
        } catch (error) {
            onError('Failed to reveal votes: ' + error.message);
        }
        setLoading(false);
    };

    const getStatusDisplay = (status) => {
        const statusMap = {
            waiting: 'Waiting for Members',
            voting: 'Voting in Progress', 
            revealing: 'Revealing Results',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => {
        return `status-badge status-${status}`;
    };

    const renderTimer = () => {
        const sessionStatus = typeof sessionDetails.session_status === 'object' 
            ? sessionDetails.session_status.value 
            : sessionDetails.session_status;
            
        if (sessionStatus !== 'voting') return null;

        const votingTimer = typeof sessionDetails.voting_timer === 'object'
            ? parseInt(sessionDetails.voting_timer.value)
            : parseInt(sessionDetails.voting_timer);

        return (
            <div className="voting-timer">
                <h3>⏰ Voting Timer: {votingTimer} seconds</h3>
                <div className="timer-bar">
                    <div className="timer-progress"></div>
                </div>
            </div>
        );
    };

    const renderVotingResults = () => {
        if (!votingResults) return null;

        const { votes } = votingResults;
        
        // Calculate vote distributions
        const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
        const impactCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const recommendationCounts = { approve: 0, approve_conditions: 0, reject: 0, defer: 0 };

        votes.forEach(vote => {
            if (vote.risk_vote) riskCounts[vote.risk_vote]++;
            if (vote.impact_vote) impactCounts[vote.impact_vote]++;
            if (vote.recommendation_vote) recommendationCounts[vote.recommendation_vote]++;
        });

        return (
            <div className="voting-results">
                <h3>Voting Results</h3>
                
                <div className="results-grid">
                    <div className="result-section">
                        <h4>Risk Assessment</h4>
                        <div className="vote-bars">
                            {Object.entries(riskCounts).map(([risk, count]) => (
                                <div key={risk} className="vote-bar">
                                    <span className="vote-label">{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
                                    <div className="bar">
                                        <div 
                                            className={`bar-fill risk-${risk}`} 
                                            style={{ width: `${(count / votes.length) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="vote-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="result-section">
                        <h4>Impact Rating</h4>
                        <div className="vote-bars">
                            {Object.entries(impactCounts).map(([impact, count]) => (
                                <div key={impact} className="vote-bar">
                                    <span className="vote-label">Impact {impact}</span>
                                    <div className="bar">
                                        <div 
                                            className="bar-fill impact-bar" 
                                            style={{ width: `${(count / votes.length) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="vote-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="result-section">
                        <h4>Recommendation</h4>
                        <div className="vote-bars">
                            {Object.entries(recommendationCounts).map(([rec, count]) => (
                                <div key={rec} className="vote-bar">
                                    <span className="vote-label">
                                        {rec.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <div className="bar">
                                        <div 
                                            className={`bar-fill rec-${rec}`} 
                                            style={{ width: `${(count / votes.length) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="vote-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="finalize-section">
                    <h4>Finalize Change Request</h4>
                    <p>Review the voting results and update the change request with final decisions.</p>
                    <button className="primary-button">
                        Finalize & Update Change Request
                    </button>
                </div>
            </div>
        );
    };

    const renderParticipants = () => {
        const onlineCount = participants.filter(p => String(p.is_online) === 'true').length;
        const votedCount = participants.filter(p => String(p.has_voted) === 'true').length;
        
        return (
            <div className="participants-panel">
                <h3>
                    Participants ({participants.length}) 
                    <span className="participant-stats">
                        • {onlineCount} online • {votedCount} voted
                    </span>
                </h3>
                <div className="participants-list">
                    {participants.map(participant => {
                        const userName = typeof participant.user === 'object' 
                            ? participant.user.display_value 
                            : participant.user;
                        const isOnline = String(participant.is_online) === 'true';
                        const hasVoted = String(participant.has_voted) === 'true';
                        
                        return (
                            <div key={typeof participant.sys_id === 'object' ? participant.sys_id.value : participant.sys_id} className="participant-item">
                                <span className="participant-name">{userName}</span>
                                <div className="participant-status">
                                    <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
                                        {isOnline ? '🟢' : '🔴'}
                                    </span>
                                    {hasVoted && <span className="voted-indicator">✓ Voted</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
        const currentRisk = typeof changeRequest.risk === 'object' 
            ? changeRequest.risk.display_value 
            : changeRequest.risk;
        const currentImpact = typeof changeRequest.impact === 'object' 
            ? changeRequest.impact.display_value 
            : changeRequest.impact;
        const crSysId = typeof changeRequest.sys_id === 'object' 
            ? changeRequest.sys_id.value 
            : changeRequest.sys_id;
            
        return (
            <div className="change-request-panel">
                <h3>✅ Change Request Selected</h3>
                <div className="cr-info">
                    <div className="cr-header">
                        <strong>{crNumber}</strong> - {shortDescription}
                    </div>
                    <div className="cr-sys-id">
                        <small>Sys ID: {crSysId}</small>
                    </div>
                    {description && (
                        <div className="cr-description">
                            <p>{description}</p>
                        </div>
                    )}
                    <div className="cr-current-values">
                        <span className="current-value">Current Risk: <strong>{currentRisk || 'Not Set'}</strong></span>
                        <span className="current-value">Current Impact: <strong>{currentImpact || 'Not Set'}</strong></span>
                    </div>
                </div>
                <button 
                    className="change-cr-button"
                    onClick={() => {
                        setChangeRequest(null);
                        setShowCRSelector(true);
                    }}
                >
                    Select Different CR
                </button>
            </div>
        );
    };

    const renderChangeRequestSelector = () => {
        if (!showCRSelector) return null;
        
        return (
            <div className="cr-selector">
                <h4>Select Change Request</h4>
                
                <div className="search-mode-toggle">
                    <label>
                        <input
                            type="radio"
                            name="searchMode"
                            value="dropdown"
                            checked={crSearchMode === 'dropdown'}
                            onChange={(e) => setCrSearchMode(e.target.value)}
                        />
                        Select from Available CRs
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="searchMode"
                            value="number"
                            checked={crSearchMode === 'number'}
                            onChange={(e) => setCrSearchMode(e.target.value)}
                        />
                        Search by Number
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="searchMode"
                            value="sysid"
                            checked={crSearchMode === 'sysid'}
                            onChange={(e) => setCrSearchMode(e.target.value)}
                        />
                        Search by Sys ID
                    </label>
                </div>

                {crSearchMode === 'dropdown' && (
                    <div className="form-group">
                        <label htmlFor="cr-dropdown">Available Change Requests:</label>
                        <select
                            id="cr-dropdown"
                            value={selectedCrFromDropdown}
                            onChange={(e) => setSelectedCrFromDropdown(e.target.value)}
                            disabled={loading}
                            className="cr-select"
                        >
                            <option value="">-- Select a Change Request --</option>
                            {availableChangeRequests.map(cr => {
                                const sysId = typeof cr.sys_id === 'object' ? cr.sys_id.value : cr.sys_id;
                                const number = typeof cr.number === 'object' ? cr.number.display_value : cr.number;
                                const description = typeof cr.short_description === 'object' ? cr.short_description.display_value : cr.short_description;
                                
                                return (
                                    <option key={sysId} value={sysId}>
                                        {number} - {description}
                                    </option>
                                );
                            })}
                        </select>
                        <small>Select from change requests in Assess or Authorize state</small>
                    </div>
                )}

                {crSearchMode === 'number' && (
                    <div className="form-group">
                        <label htmlFor="cr-number">Change Request Number:</label>
                        <input
                            id="cr-number"
                            type="text"
                            value={changeRequestNumber}
                            onChange={(e) => setChangeRequestNumber(e.target.value)}
                            placeholder="e.g., CHG0030001"
                            disabled={loading}
                            className="cr-input"
                        />
                        <small>Enter the change request number (e.g., CHG0030001)</small>
                    </div>
                )}

                {crSearchMode === 'sysid' && (
                    <div className="form-group">
                        <label htmlFor="cr-id">Change Request Sys ID:</label>
                        <input
                            id="cr-id"
                            type="text"
                            value={changeRequestId}
                            onChange={(e) => setChangeRequestId(e.target.value)}
                            placeholder="e.g., 3dc83c5e5347c12200e0ef563dbb9a7190"
                            disabled={loading}
                            className="cr-input"
                        />
                        <small>Enter the 32-character sys_id (e.g., 3dc83c5e5347c12200e0ef563dbb9a7190)</small>
                    </div>
                )}
                
                <div className="selector-actions">
                    <button 
                        className="secondary-button"
                        onClick={() => setShowCRSelector(false)}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="primary-button"
                        onClick={handleSelectChangeRequest}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load Change Request'}
                    </button>
                </div>
            </div>
        );
    };

    if (!sessionDetails) {
        return <div className="loading">Loading session...</div>;
    }

    const sessionStatus = typeof sessionDetails.session_status === 'object' 
        ? sessionDetails.session_status.value 
        : sessionDetails.session_status;
    const sessionCode = typeof sessionDetails.session_code === 'object' 
        ? sessionDetails.session_code.value 
        : sessionDetails.session_code;

    return (
        <div className="session-dashboard">
            <div className="session-card">
                <h2>CAB Session Dashboard</h2>
                
                <div className="session-info">
                    <div className="info-item">
                        <label>Session Code</label>
                        <div className="value session-code">{sessionCode}</div>
                    </div>
                    <div className="info-item">
                        <label>Status</label>
                        <div className="value">
                            <span className={getStatusClass(sessionStatus)}>
                                {getStatusDisplay(sessionStatus)}
                            </span>
                        </div>
                    </div>
                    <div className="info-item">
                        <label>Participants</label>
                        <div className="value">{participants.length} joined</div>
                    </div>
                </div>

                {sessionStatus === 'voting' && renderTimer()}
                {renderChangeRequest()}
                {renderChangeRequestSelector()}
                {renderParticipants()}
                {renderVotingResults()}

                <div className="session-actions">
                    {!changeRequest && (
                        <button 
                            className="secondary-button"
                            onClick={() => setShowCRSelector(true)}
                            disabled={loading || showCRSelector}
                        >
                            Select Change Request
                        </button>
                    )}
                    
                    {changeRequest && sessionStatus === 'waiting' && (
                        <button 
                            className="primary-button"
                            onClick={handleStartVoting}
                            disabled={loading}
                        >
                            {loading ? 'Starting...' : 'Start Voting'}
                        </button>
                    )}
                    
                    {sessionStatus === 'voting' && (
                        <button 
                            className="secondary-button"
                            onClick={handleRevealVotes}
                            disabled={loading}
                        >
                            {loading ? 'Revealing...' : 'Reveal Votes'}
                        </button>
                    )}
                </div>

                {/* Debugging Info */}
                <div className="debug-panel" style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <h4>Debug Info:</h4>
                    <p><strong>Session ID:</strong> {session.session_id}</p>
                    <p><strong>Selected Change Request:</strong> {changeRequest ? (typeof changeRequest.sys_id === 'object' ? changeRequest.sys_id.value : changeRequest.sys_id) : 'None'}</p>
                    <p><strong>Session Status:</strong> {sessionStatus}</p>
                </div>
            </div>
        </div>
    );
}