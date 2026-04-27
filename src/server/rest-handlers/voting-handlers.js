import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide'

const VALID_RISK_VOTES = { low: true, medium: true, high: true, critical: true };
const VALID_RECOMMENDATION_VOTES = { approve: true, approve_conditions: true, reject: true, defer: true };

// Canonical Scripted REST API body access: request.body.data is the parsed JSON.
// Fall back to dataString (raw) and queryParams for compatibility with non-JSON callers.
function readRequestBody(request) {
    if (!request) return {};
    try {
        if (request.body) {
            if (request.body.data && typeof request.body.data === 'object') {
                return request.body.data;
            }
            if (typeof request.body.dataString === 'string' && request.body.dataString.length > 0) {
                try {
                    return JSON.parse(request.body.dataString);
                } catch (e) {
                    gs.warn('CAB Poker - Could not parse dataString as JSON: ' + e.message);
                }
            }
        }
        if (request.queryParams) {
            const out = {};
            const keys = Object.keys(request.queryParams);
            for (let i = 0; i < keys.length; i++) {
                const v = request.queryParams[keys[i]];
                out[keys[i]] = Array.isArray(v) ? v[0] : v;
            }
            return out;
        }
    } catch (e) {
        gs.error('CAB Poker - Exception in readRequestBody: ' + e.message);
    }
    return {};
}

function sendJson(response, status, body) {
    response.setStatus(status);
    response.setContentType('application/json');
    response.getStreamWriter().writeString(JSON.stringify(body));
}

function logVoteEvent(sessionId, userId, action, details) {
    try {
        const auditGr = new GlideRecord('x_1862662_cab_poke_vote_audit');
        if (!auditGr.isValid()) return;
        auditGr.initialize();
        auditGr.setValue('session', sessionId);
        auditGr.setValue('user', userId);
        auditGr.setValue('action', action);
        auditGr.setValue('event_time', new GlideDateTime());
        if (details) {
            auditGr.setValue('details', JSON.stringify(details));
        }
        auditGr.insert();
    } catch (e) {
        gs.warn('CAB Poker - Audit log failed: ' + e.message);
    }
}

// Start voting for a change request
export function startVoting(request, response) {
    try {
        const sessionId = request.pathParams && request.pathParams.session_id;
        const body = readRequestBody(request);
        const changeRequestId = body.change_request_id;

        if (!sessionId) {
            return sendJson(response, 400, { error: 'session_id path parameter is required' });
        }
        if (!changeRequestId || String(changeRequestId).trim() === '') {
            return sendJson(response, 400, { error: 'Change request ID is required to start voting' });
        }

        const userId = gs.getUserID();
        if (!userId) {
            return sendJson(response, 401, { error: 'Authentication required' });
        }

        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            return sendJson(response, 404, { error: 'Session not found' });
        }
        if (sessionGr.getValue('chair_user') !== userId) {
            return sendJson(response, 403, { error: 'Only the session chair can start voting' });
        }

        const cleanCrId = String(changeRequestId).trim();
        const crGr = new GlideRecord('change_request');
        if (!crGr.get(cleanCrId)) {
            return sendJson(response, 404, { error: 'Change request not found: ' + cleanCrId });
        }

        // Clear any prior votes on this session so a re-start gives a clean slate.
        const oldVotes = new GlideRecord('x_1862662_cab_poke_vote');
        oldVotes.addQuery('session', sessionId);
        oldVotes.query();
        oldVotes.deleteMultiple();

        sessionGr.setValue('change_request', cleanCrId);
        sessionGr.setValue('session_status', 'voting');
        sessionGr.setValue('voting_start_time', new GlideDateTime());
        sessionGr.update();

        const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
        participantGr.addQuery('session', sessionId);
        participantGr.query();
        while (participantGr.next()) {
            participantGr.setValue('has_voted', false);
            participantGr.update();
        }

        logVoteEvent(sessionId, userId, 'start_voting', { change_request: cleanCrId });

        sendJson(response, 200, {
            status: 'voting_started',
            voting_start_time: sessionGr.getValue('voting_start_time'),
            voting_timer: sessionGr.getValue('voting_timer'),
            change_request_id: cleanCrId
        });
    } catch (e) {
        gs.error('CAB Poker - Start Voting Error: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// Submit a vote
export function submitVote(request, response) {
    try {
        const sessionId = request.pathParams && request.pathParams.session_id;
        const body = readRequestBody(request);

        if (!sessionId) {
            return sendJson(response, 400, { error: 'session_id path parameter is required' });
        }

        const riskVote = body.risk_vote;
        const impactVoteRaw = body.impact_vote;
        const recommendationVote = body.recommendation_vote;

        if (!riskVote || !impactVoteRaw || !recommendationVote) {
            return sendJson(response, 400, { error: 'All vote fields (risk, impact, recommendation) are required' });
        }
        if (!VALID_RISK_VOTES.hasOwnProperty(riskVote)) {
            return sendJson(response, 400, { error: 'Invalid risk vote: ' + riskVote });
        }
        if (!VALID_RECOMMENDATION_VOTES.hasOwnProperty(recommendationVote)) {
            return sendJson(response, 400, { error: 'Invalid recommendation vote: ' + recommendationVote });
        }
        const impactVote = parseInt(impactVoteRaw, 10);
        if (!(impactVote >= 1 && impactVote <= 5)) {
            return sendJson(response, 400, { error: 'Invalid impact vote (must be 1..5): ' + impactVoteRaw });
        }

        const userId = gs.getUserID();
        if (!userId) {
            return sendJson(response, 401, { error: 'Authentication required' });
        }

        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            return sendJson(response, 404, { error: 'Session not found' });
        }
        if (sessionGr.getValue('session_status') !== 'voting') {
            return sendJson(response, 400, { error: 'Session is not in voting state' });
        }

        // Server-side voting-window enforcement so a slow client cannot vote past the timer.
        const startTimeStr = sessionGr.getValue('voting_start_time');
        const timerSeconds = parseInt(sessionGr.getValue('voting_timer'), 10) || 30;
        if (startTimeStr) {
            const startGdt = new GlideDateTime(startTimeStr);
            const elapsed = (new GlideDateTime()).getNumericValue() - startGdt.getNumericValue();
            // Allow a 2-second grace for network latency.
            if (elapsed > (timerSeconds + 2) * 1000) {
                return sendJson(response, 400, { error: 'Voting window has closed' });
            }
        }

        const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
        participantGr.addQuery('session', sessionId);
        participantGr.addQuery('user', userId);
        participantGr.query();
        if (!participantGr.next()) {
            return sendJson(response, 403, { error: 'User is not a participant in this session' });
        }
        const participantId = participantGr.getUniqueValue();

        const existingVote = new GlideRecord('x_1862662_cab_poke_vote');
        existingVote.addQuery('session', sessionId);
        existingVote.addQuery('user', userId);
        existingVote.query();
        const hasExisting = existingVote.next();

        let voteGr;
        if (hasExisting) {
            voteGr = existingVote;
        } else {
            voteGr = new GlideRecord('x_1862662_cab_poke_vote');
            voteGr.initialize();
            voteGr.setValue('session', sessionId);
            voteGr.setValue('participant', participantId);
            voteGr.setValue('user', userId);
        }

        voteGr.setValue('risk_vote', riskVote);
        voteGr.setValue('impact_vote', impactVote);
        voteGr.setValue('recommendation_vote', recommendationVote);
        voteGr.setValue('vote_time', new GlideDateTime());

        if (hasExisting) {
            voteGr.update();
        } else {
            voteGr.insert();
        }

        participantGr.setValue('has_voted', true);
        participantGr.setValue('last_activity', new GlideDateTime());
        participantGr.update();

        logVoteEvent(sessionId, userId, hasExisting ? 'update_vote' : 'submit_vote', {
            risk: riskVote,
            impact: impactVote,
            recommendation: recommendationVote
        });

        sendJson(response, 200, { status: 'vote_submitted' });
    } catch (e) {
        gs.error('CAB Poker - Submit Vote Error: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// Reveal votes (chair only)
export function revealVotes(request, response) {
    try {
        const sessionId = request.pathParams && request.pathParams.session_id;
        const userId = gs.getUserID();

        if (!sessionId) {
            return sendJson(response, 400, { error: 'session_id path parameter is required' });
        }
        if (!userId) {
            return sendJson(response, 401, { error: 'Authentication required' });
        }

        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            return sendJson(response, 404, { error: 'Session not found' });
        }
        if (sessionGr.getValue('chair_user') !== userId) {
            return sendJson(response, 403, { error: 'Only the session chair can reveal votes' });
        }

        sessionGr.setValue('session_status', 'revealing');
        sessionGr.update();

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

        logVoteEvent(sessionId, userId, 'reveal_votes', { vote_count: votes.length });

        sendJson(response, 200, { status: 'votes_revealed', votes: votes });
    } catch (e) {
        gs.error('CAB Poker - Reveal Votes Error: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// Finalize a session: chair sets final risk/impact/recommendation, server marks
// session completed. The session-completion business rule then writes back to change_request.
export function finalizeSession(request, response) {
    try {
        const sessionId = request.pathParams && request.pathParams.session_id;
        const body = readRequestBody(request);
        const userId = gs.getUserID();

        if (!sessionId) {
            return sendJson(response, 400, { error: 'session_id path parameter is required' });
        }
        if (!userId) {
            return sendJson(response, 401, { error: 'Authentication required' });
        }

        const finalRisk = body.final_risk;
        const finalImpactRaw = body.final_impact;
        const finalRecommendation = body.final_recommendation;

        if (!finalRisk || !finalImpactRaw || !finalRecommendation) {
            return sendJson(response, 400, { error: 'final_risk, final_impact, and final_recommendation are required' });
        }
        if (!VALID_RISK_VOTES.hasOwnProperty(finalRisk)) {
            return sendJson(response, 400, { error: 'Invalid final_risk: ' + finalRisk });
        }
        if (!VALID_RECOMMENDATION_VOTES.hasOwnProperty(finalRecommendation)) {
            return sendJson(response, 400, { error: 'Invalid final_recommendation: ' + finalRecommendation });
        }
        const finalImpact = parseInt(finalImpactRaw, 10);
        if (!(finalImpact >= 1 && finalImpact <= 5)) {
            return sendJson(response, 400, { error: 'Invalid final_impact (must be 1..5): ' + finalImpactRaw });
        }

        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        if (!sessionGr.get(sessionId)) {
            return sendJson(response, 404, { error: 'Session not found' });
        }
        if (sessionGr.getValue('chair_user') !== userId) {
            return sendJson(response, 403, { error: 'Only the session chair can finalize' });
        }

        sessionGr.setValue('final_risk', finalRisk);
        sessionGr.setValue('final_impact', finalImpact);
        sessionGr.setValue('final_recommendation', finalRecommendation);
        sessionGr.setValue('session_status', 'completed');
        sessionGr.setValue('active', false);
        sessionGr.update();

        logVoteEvent(sessionId, userId, 'finalize', {
            risk: finalRisk,
            impact: finalImpact,
            recommendation: finalRecommendation
        });

        sendJson(response, 200, {
            status: 'finalized',
            final_risk: finalRisk,
            final_impact: finalImpact,
            final_recommendation: finalRecommendation
        });
    } catch (e) {
        gs.error('CAB Poker - Finalize Session Error: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}