import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide'

// Helper function to safely convert to string
function safeToString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value);
}

// Helper function to read request body using ServiceNow-specific methods
function readRequestBody(request) {
    gs.info('CAB Poker - readRequestBody: Starting ServiceNow-specific body reading');
    
    let body = {};
    let found = false;
    
    try {
        // ServiceNow Scripted REST API body access
        if (request.body) {
            gs.info('CAB Poker - Request body exists, type: ' + typeof request.body);
            
            // Method 1: Direct property access (ServiceNow often parses JSON automatically)
            if (request.body.change_request_id) {
                body.change_request_id = request.body.change_request_id;
                found = true;
                gs.info('CAB Poker - Found change_request_id directly in body: ' + body.change_request_id);
            }
            else if (request.body.risk_vote || request.body.impact_vote || request.body.recommendation_vote) {
                body = {
                    risk_vote: request.body.risk_vote,
                    impact_vote: request.body.impact_vote,
                    recommendation_vote: request.body.recommendation_vote
                };
                found = true;
                gs.info('CAB Poker - Found vote data directly in body');
            }
            // Method 2: Try data property
            else if (request.body.data && typeof request.body.data === 'object') {
                body = request.body.data;
                found = true;
                gs.info('CAB Poker - Using body.data object: ' + JSON.stringify(body));
            }
            // Method 3: Try parsing dataString
            else if (request.body.dataString) {
                try {
                    if (typeof request.body.dataString === 'object') {
                        body = request.body.dataString;
                    } else {
                        body = JSON.parse(request.body.dataString);
                    }
                    found = true;
                    gs.info('CAB Poker - Parsed dataString: ' + JSON.stringify(body));
                } catch (e) {
                    gs.error('CAB Poker - Failed to parse dataString: ' + e.message);
                }
            }
            // Method 4: Try parsing body as string
            else if (typeof request.body === 'string') {
                try {
                    body = JSON.parse(request.body);
                    found = true;
                    gs.info('CAB Poker - Parsed string body: ' + JSON.stringify(body));
                } catch (e) {
                    gs.error('CAB Poker - Failed to parse string body: ' + e.message);
                }
            }
        }
        
        // Fallback to query parameters
        if (!found && request.queryParams) {
            gs.info('CAB Poker - Checking query parameters as fallback');
            const queryKeys = Object.keys(request.queryParams);
            gs.info('CAB Poker - Available query parameters: ' + queryKeys.join(', '));
            
            // Map query parameters to body
            if (request.queryParams.change_request_id) {
                body.change_request_id = request.queryParams.change_request_id;
                found = true;
            }
            if (request.queryParams.risk_vote) {
                body.risk_vote = request.queryParams.risk_vote;
                body.impact_vote = request.queryParams.impact_vote;
                body.recommendation_vote = request.queryParams.recommendation_vote;
                found = true;
            }
        }
        
    } catch (e) {
        gs.error('CAB Poker - Exception in readRequestBody: ' + e.message);
    }
    
    gs.info('CAB Poker - Body extraction final result - Found: ' + found + ', Body: ' + JSON.stringify(body));
    return body;
}

// Start voting for a change request
export function startVoting(request, response) {
    try {
        gs.info('CAB Poker - Start Voting: Processing request');
        const sessionId = request.pathParams.session_id;
        gs.info('CAB Poker - Session ID from path: ' + sessionId);
        
        const body = readRequestBody(request);
        const changeRequestId = body.change_request_id;
        
        gs.info('CAB Poker - Change request ID extracted: ' + changeRequestId);
        
        if (!changeRequestId || changeRequestId.trim() === '') {
            gs.error('CAB Poker - No change request ID provided');
            response.setStatus(400);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Change request ID is required to start voting'
            }));
            return;
        }
        
        const userId = gs.getUserID();
        
        // Verify user is the chair of this session
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session not found'
            }));
            return;
        }
        
        if (sessionGr.getValue('chair_user') !== userId) {
            response.setStatus(403);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Only the session chair can start voting'
            }));
            return;
        }
        
        // Validate change request exists
        const crGr = new GlideRecord('change_request');
        if (!crGr.get(changeRequestId.trim())) {
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Change request not found: ' + changeRequestId
            }));
            return;
        }
        
        // Update session with change request and start voting
        sessionGr.setValue('change_request', changeRequestId.trim());
        sessionGr.setValue('session_status', 'voting');
        sessionGr.setValue('voting_start_time', new GlideDateTime());
        sessionGr.update();
        
        // Reset participant vote status
        const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
        participantGr.addQuery('session', sessionId);
        participantGr.query();
        while (participantGr.next()) {
            participantGr.setValue('has_voted', false);
            participantGr.update();
        }
        
        response.setStatus(200);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            status: 'voting_started',
            voting_start_time: sessionGr.getValue('voting_start_time'),
            voting_timer: sessionGr.getValue('voting_timer'),
            change_request_id: changeRequestId.trim()
        }));
        
    } catch (e) {
        gs.error('CAB Poker - Start Voting Error: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}

// Submit a vote
export function submitVote(request, response) {
    try {
        gs.info('CAB Poker - Submit Vote: Processing request');
        const sessionId = request.pathParams.session_id;
        
        const body = readRequestBody(request);
        gs.info('CAB Poker - Vote data extracted: ' + JSON.stringify(body));
        
        if (!body.risk_vote || !body.impact_vote || !body.recommendation_vote) {
            response.setStatus(400);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'All vote fields (risk, impact, recommendation) are required'
            }));
            return;
        }
        
        const userId = gs.getUserID();
        
        // Verify session is in voting state
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session not found'
            }));
            return;
        }
        
        if (sessionGr.getValue('session_status') !== 'voting') {
            response.setStatus(400);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session is not in voting state'
            }));
            return;
        }
        
        // Get participant record
        const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
        participantGr.addQuery('session', sessionId);
        participantGr.addQuery('user', userId);
        participantGr.query();
        
        if (!participantGr.hasNext()) {
            response.setStatus(403);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'User is not a participant in this session'
            }));
            return;
        }
        
        participantGr.next();
        const participantId = participantGr.getUniqueValue();
        
        // Check if user already voted, update existing vote or create new one
        const existingVote = new GlideRecord('x_1862662_cab_poke_vote');
        existingVote.addQuery('session', sessionId);
        existingVote.addQuery('user', userId);
        existingVote.query();
        
        let voteGr;
        if (existingVote.hasNext()) {
            existingVote.next();
            voteGr = existingVote;
        } else {
            voteGr = new GlideRecord('x_1862662_cab_poke_vote');
            voteGr.initialize();
            voteGr.setValue('session', sessionId);
            voteGr.setValue('participant', participantId);
            voteGr.setValue('user', userId);
        }
        
        voteGr.setValue('risk_vote', body.risk_vote);
        voteGr.setValue('impact_vote', body.impact_vote);
        voteGr.setValue('recommendation_vote', body.recommendation_vote);
        voteGr.setValue('vote_time', new GlideDateTime());
        
        if (existingVote.hasNext()) {
            voteGr.update();
        } else {
            voteGr.insert();
        }
        
        // Update participant voted status
        participantGr.setValue('has_voted', true);
        participantGr.setValue('last_activity', new GlideDateTime());
        participantGr.update();
        
        response.setStatus(200);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            status: 'vote_submitted'
        }));
        
    } catch (e) {
        gs.error('CAB Poker - Submit Vote Error: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}

// Reveal votes (chair only)
export function revealVotes(request, response) {
    try {
        gs.info('CAB Poker - Reveal Votes: Processing request');
        const sessionId = request.pathParams.session_id;
        const userId = gs.getUserID();
        
        // Verify user is the chair
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session not found'
            }));
            return;
        }
        
        if (sessionGr.getValue('chair_user') !== userId) {
            response.setStatus(403);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Only the session chair can reveal votes'
            }));
            return;
        }
        
        // Update session status
        sessionGr.setValue('session_status', 'revealing');
        sessionGr.update();
        
        // Get all votes for this session
        const votes = [];
        const voteGr = new GlideRecord('x_1862662_cab_poke_vote');
        voteGr.addQuery('session', sessionId);
        voteGr.query();
        
        while (voteGr.next()) {
            votes.push({
                user: voteGr.getDisplayValue('user'),
                risk_vote: voteGr.getValue('risk_vote'),
                impact_vote: voteGr.getValue('impact_vote'),
                recommendation_vote: voteGr.getValue('recommendation_vote'),
                vote_time: voteGr.getValue('vote_time')
            });
        }
        
        response.setStatus(200);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            status: 'votes_revealed',
            votes: votes
        }));
        
    } catch (e) {
        gs.error('CAB Poker - Reveal Votes Error: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}