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