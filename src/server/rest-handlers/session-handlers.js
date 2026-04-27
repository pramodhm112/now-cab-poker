import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide'

// Generate a unique 6-character session code (uppercase alphanumerics, no I/O/0/1 to avoid ambiguity).
function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

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

// Create a new CAB session
export function createSession(request, response) {
    try {
        const body = readRequestBody(request);
        const chairUserId = gs.getUserID();

        if (!chairUserId) {
            return sendJson(response, 401, { error: 'Authentication required' });
        }

        // Voting timer: clamp to a sensible 10..300s window.
        let votingTimer = parseInt(body.voting_timer, 10);
        if (!(votingTimer >= 10 && votingTimer <= 300)) votingTimer = 30;

        let sessionCode = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            sessionCode = generateSessionCode();
            const existingSession = new GlideRecord('x_1862662_cab_poke_session');
            existingSession.addQuery('session_code', sessionCode);
            existingSession.addQuery('active', true);
            existingSession.query();
            if (!existingSession.hasNext()) {
                isUnique = true;
            }
            attempts++;
        }
        if (!isUnique) {
            return sendJson(response, 500, { error: 'Unable to generate unique session code' });
        }

        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        sessionGr.initialize();
        sessionGr.setValue('session_code', sessionCode);
        sessionGr.setValue('chair_user', chairUserId);
        sessionGr.setValue('session_status', 'waiting');
        sessionGr.setValue('active', true);
        sessionGr.setValue('voting_timer', votingTimer);

        const sessionSysId = sessionGr.insert();
        if (!sessionSysId) {
            return sendJson(response, 500, { error: 'Failed to create session' });
        }

        sendJson(response, 201, {
            session_id: sessionSysId,
            session_code: sessionCode,
            chair_user: chairUserId,
            status: 'waiting',
            voting_timer: votingTimer
        });
    } catch (e) {
        gs.error('CAB Poker - Create Session Exception: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// Resolve session_code from body or query/path. Uppercase + trimmed.
function extractSessionCode(request) {
    const body = readRequestBody(request);
    let raw = body && body.session_code;
    if (!raw && request.queryParams && request.queryParams.session_code) raw = request.queryParams.session_code;
    if (!raw && request.pathParams && request.pathParams.session_code) raw = request.pathParams.session_code;
    if (!raw) return '';
    return String(raw).trim().toUpperCase();
}

function joinOrRejoin(sessionCode, userId, response) {
    if (!userId) {
        return sendJson(response, 401, { error: 'Authentication required' });
    }
    if (!sessionCode) {
        return sendJson(response, 400, { error: 'Session code is required' });
    }

    const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
    sessionGr.addQuery('session_code', sessionCode);
    sessionGr.addQuery('active', true);
    sessionGr.query();
    if (!sessionGr.next()) {
        return sendJson(response, 404, { error: 'Session not found or inactive' });
    }
    const sessionId = sessionGr.getUniqueValue();

    const existingParticipant = new GlideRecord('x_1862662_cab_poke_participant');
    existingParticipant.addQuery('session', sessionId);
    existingParticipant.addQuery('user', userId);
    existingParticipant.query();

    if (existingParticipant.next()) {
        existingParticipant.setValue('last_activity', new GlideDateTime());
        existingParticipant.setValue('is_online', true);
        existingParticipant.update();
        return sendJson(response, 200, {
            session_id: sessionId,
            participant_id: existingParticipant.getUniqueValue(),
            status: 'rejoined',
            session_code: sessionCode
        });
    }

    const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
    participantGr.initialize();
    participantGr.setValue('session', sessionId);
    participantGr.setValue('user', userId);
    participantGr.setValue('join_time', new GlideDateTime());
    participantGr.setValue('last_activity', new GlideDateTime());
    participantGr.setValue('is_online', true);
    participantGr.setValue('has_voted', false);
    const participantId = participantGr.insert();

    if (!participantId) {
        return sendJson(response, 500, { error: 'Failed to join session' });
    }
    sendJson(response, 201, {
        session_id: sessionId,
        participant_id: participantId,
        status: 'joined',
        session_code: sessionCode
    });
}

// GET /session/{session_id} — return the fields the client UI needs.
// Routed through Scripted REST so it uses *our* ACL chain instead of the OOTB
// Table API, which returns 404 for any record a user can't read.
export function getSession(request, response) {
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

        // Caller must be either the chair or a participant of this session.
        const isChair = sessionGr.getValue('chair_user') === userId;
        let isParticipant = false;
        if (!isChair) {
            const part = new GlideRecord('x_1862662_cab_poke_participant');
            part.addQuery('session', sessionId);
            part.addQuery('user', userId);
            part.query();
            isParticipant = part.hasNext();
        }
        if (!isChair && !isParticipant) {
            return sendJson(response, 403, { error: 'Not a member of this session' });
        }

        sendJson(response, 200, {
            sys_id: sessionGr.getUniqueValue(),
            session_code: sessionGr.getValue('session_code'),
            session_status: sessionGr.getValue('session_status'),
            voting_timer: parseInt(sessionGr.getValue('voting_timer'), 10) || 30,
            voting_start_time: sessionGr.getValue('voting_start_time'),
            change_request: sessionGr.getValue('change_request'),
            chair_user: sessionGr.getValue('chair_user'),
            chair_user_display: sessionGr.getDisplayValue('chair_user'),
            final_risk: sessionGr.getValue('final_risk'),
            final_impact: sessionGr.getValue('final_impact'),
            final_recommendation: sessionGr.getValue('final_recommendation'),
            active: sessionGr.getValue('active') === '1'
        });
    } catch (e) {
        gs.error('CAB Poker - Get Session Exception: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// GET /session/{session_id}/change-request — return the change_request currently
// associated with this session, gated by *our* ACL: caller must be the chair or a
// participant. Members lack platform-wide change_request read access, so they
// cannot use the OOTB Table API; this endpoint is the authorized alternative.
export function getSessionChangeRequest(request, response) {
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

        const isChair = sessionGr.getValue('chair_user') === userId;
        let isParticipant = false;
        if (!isChair) {
            const part = new GlideRecord('x_1862662_cab_poke_participant');
            part.addQuery('session', sessionId);
            part.addQuery('user', userId);
            part.query();
            isParticipant = part.hasNext();
        }
        if (!isChair && !isParticipant) {
            return sendJson(response, 403, { error: 'Not a member of this session' });
        }

        const crId = sessionGr.getValue('change_request');
        if (!crId) {
            return sendJson(response, 200, { change_request: null });
        }

        const crGr = new GlideRecord('change_request');
        // The session's chair may have set this CR with elevated rights; we read it
        // via the scoped handler and return only the fields the UI needs.
        if (!crGr.get(crId)) {
            return sendJson(response, 200, { change_request: null });
        }

        sendJson(response, 200, {
            change_request: {
                sys_id: crGr.getUniqueValue(),
                number: crGr.getValue('number'),
                short_description: crGr.getValue('short_description'),
                description: crGr.getValue('description'),
                risk: crGr.getValue('risk'),
                risk_display: crGr.getDisplayValue('risk'),
                impact: crGr.getValue('impact'),
                impact_display: crGr.getDisplayValue('impact'),
                priority: crGr.getValue('priority'),
                priority_display: crGr.getDisplayValue('priority'),
                state: crGr.getValue('state'),
                state_display: crGr.getDisplayValue('state'),
                category: crGr.getValue('category')
            }
        });
    } catch (e) {
        gs.error('CAB Poker - Get Session CR Exception: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// GET /session/{session_id}/participants — list of participants for the chair UI.
export function getParticipants(request, response) {
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

        const isChair = sessionGr.getValue('chair_user') === userId;
        let isParticipant = false;
        if (!isChair) {
            const me = new GlideRecord('x_1862662_cab_poke_participant');
            me.addQuery('session', sessionId);
            me.addQuery('user', userId);
            me.query();
            isParticipant = me.hasNext();
        }
        if (!isChair && !isParticipant) {
            return sendJson(response, 403, { error: 'Not a member of this session' });
        }

        const participants = [];
        const part = new GlideRecord('x_1862662_cab_poke_participant');
        part.addQuery('session', sessionId);
        part.orderBy('join_time');
        part.query();
        while (part.next()) {
            participants.push({
                sys_id: part.getUniqueValue(),
                user: part.getValue('user'),
                user_display: part.getDisplayValue('user'),
                is_online: part.getValue('is_online') === '1',
                has_voted: part.getValue('has_voted') === '1',
                join_time: part.getValue('join_time'),
                last_activity: part.getValue('last_activity')
            });
        }
        sendJson(response, 200, { participants: participants });
    } catch (e) {
        gs.error('CAB Poker - Get Participants Exception: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

export function joinSession(request, response) {
    try {
        joinOrRejoin(extractSessionCode(request), gs.getUserID(), response);
    } catch (e) {
        gs.error('CAB Poker - Join Session Exception: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}

// GET /join/{session_code} — convenience for users following a shared link.
export function joinSessionAlternative(request, response) {
    try {
        joinOrRejoin(extractSessionCode(request), gs.getUserID(), response);
    } catch (e) {
        gs.error('CAB Poker - Alternative Join Error: ' + e.message);
        sendJson(response, 500, { error: 'Internal server error: ' + e.message });
    }
}