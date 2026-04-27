import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide'

// Simple test endpoint to debug request body handling
export function testRequestBody(request, response) {
    try {
        gs.info('CAB Poker TEST - Request method: ' + request.method);
        gs.info('CAB Poker TEST - Content-Type: ' + (request.headers ? request.headers['Content-Type'] : 'none'));
        
        // Log everything we can about the request
        gs.info('CAB Poker TEST - Request keys: ' + Object.keys(request).join(', '));
        
        if (request.body) {
            gs.info('CAB Poker TEST - Body exists, type: ' + typeof request.body);
            gs.info('CAB Poker TEST - Body keys: ' + Object.keys(request.body).join(', '));
            
            // Try all possible body access methods
            const methods = ['data', 'dataString', 'dataStream'];
            methods.forEach(function(method) {
                if (request.body[method] !== undefined) {
                    gs.info('CAB Poker TEST - Body.' + method + ': ' + JSON.stringify(request.body[method]));
                }
            });
        }
        
        // Check query params
        if (request.queryParams) {
            gs.info('CAB Poker TEST - Query params: ' + JSON.stringify(request.queryParams));
        }
        
        // Check path params
        if (request.pathParams) {
            gs.info('CAB Poker TEST - Path params: ' + JSON.stringify(request.pathParams));
        }
        
        response.setStatus(200);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            status: 'debug_complete',
            message: 'Check system logs for request details'
        }));
        
    } catch (e) {
        gs.error('CAB Poker TEST - Error: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Test error: ' + e.message
        }));
    }
}

// Generate a unique 6-character session code
export function generateSessionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper function to read request body using ServiceNow-specific methods
function readRequestBody(request) {
    gs.info('CAB Poker - readRequestBody: Starting ServiceNow-specific body reading');
    
    let body = {};
    let found = false;
    
    try {
        // NEW: Try accessing request body using ServiceNow's actual method
        if (request.body) {
            gs.info('CAB Poker - Request body exists, attempting to read...');
            
            // In ServiceNow Scripted REST APIs, the body might be in request.body.data
            if (request.body.data !== undefined) {
                gs.info('CAB Poker - Found body.data, type: ' + typeof request.body.data);
                
                if (typeof request.body.data === 'object' && request.body.data !== null) {
                    // Body is already parsed as object
                    body = request.body.data;
                    found = true;
                    gs.info('CAB Poker - Using body.data as object: ' + JSON.stringify(body));
                } else if (typeof request.body.data === 'string') {
                    // Body is string, need to parse
                    try {
                        body = JSON.parse(request.body.data);
                        found = true;
                        gs.info('CAB Poker - Parsed body.data string: ' + JSON.stringify(body));
                    } catch (e) {
                        gs.error('CAB Poker - Failed to parse body.data: ' + e.message);
                    }
                }
            }
            
            // Try dataString if data didn't work
            if (!found && request.body.dataString !== undefined) {
                gs.info('CAB Poker - Trying body.dataString, type: ' + typeof request.body.dataString);
                
                if (typeof request.body.dataString === 'string') {
                    try {
                        body = JSON.parse(request.body.dataString);
                        found = true;
                        gs.info('CAB Poker - Parsed body.dataString: ' + JSON.stringify(body));
                    } catch (e) {
                        gs.error('CAB Poker - Failed to parse body.dataString: ' + e.message);
                    }
                }
            }
        }
        
        // Fallback to query parameters
        if (!found && request.queryParams) {
            gs.info('CAB Poker - Checking query parameters as fallback');
            const queryKeys = Object.keys(request.queryParams);
            gs.info('CAB Poker - Available query parameters: ' + queryKeys.join(', '));
            
            if (request.queryParams.session_code) {
                gs.info('CAB Poker - Found session_code in query params: ' + request.queryParams.session_code);
                body = { session_code: request.queryParams.session_code };
                found = true;
            }
        }
        
    } catch (e) {
        gs.error('CAB Poker - Exception in readRequestBody: ' + e.message);
    }
    
    gs.info('CAB Poker - Body extraction final result - Found: ' + found + ', Body: ' + JSON.stringify(body));
    return body;
}

// Create a new CAB session
export function createSession(request, response) {
    try {
        gs.info('CAB Poker - Create Session: Starting request processing');
        
        const body = readRequestBody(request);
        const chairUserId = gs.getUserID();
        
        if (!chairUserId) {
            response.setStatus(401);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Authentication required'
            }));
            return;
        }
        
        // Generate unique session code
        let sessionCode;
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
            response.setStatus(500);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Unable to generate unique session code'
            }));
            return;
        }
        
        // Create the session
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        sessionGr.initialize();
        sessionGr.setValue('session_code', sessionCode);
        sessionGr.setValue('chair_user', chairUserId);
        sessionGr.setValue('session_status', 'waiting');
        sessionGr.setValue('active', true);
        sessionGr.setValue('voting_timer', body.voting_timer || 30);
        
        const sessionSysId = sessionGr.insert();
        
        if (sessionSysId) {
            const responseData = {
                session_id: sessionSysId,
                session_code: sessionCode,
                chair_user: chairUserId,
                status: 'waiting',
                voting_timer: body.voting_timer || 30
            };
            
            response.setStatus(201);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify(responseData));
        } else {
            response.setStatus(500);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Failed to create session'
            }));
        }
        
    } catch (e) {
        gs.error('CAB Poker - Create Session Exception: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}

// Join an existing session - COMPLETELY REWRITTEN FOR SERVICENOW
export function joinSession(request, response) {
    try {
        gs.info('CAB Poker - Join Session: Starting ENHANCED ServiceNow processing');
        
        // NEW APPROACH: Use ServiceNow's proper request body handling
        let sessionCode = '';
        
        // ServiceNow Scripted REST API body access - try the correct way
        if (request.body) {
            gs.info('CAB Poker - Request body exists, type: ' + typeof request.body);
            
            // For ServiceNow, try direct property access first
            if (request.body.session_code) {
                sessionCode = request.body.session_code;
                gs.info('CAB Poker - Got session code directly from body.session_code: ' + sessionCode);
            }
            // Try accessing nested data
            else if (request.body.data && request.body.data.session_code) {
                sessionCode = request.body.data.session_code;
                gs.info('CAB Poker - Got session code from body.data.session_code: ' + sessionCode);
            }
            // Try parsing if it's a string
            else if (typeof request.body === 'string') {
                try {
                    const parsed = JSON.parse(request.body);
                    sessionCode = parsed.session_code;
                    gs.info('CAB Poker - Parsed string body, got session code: ' + sessionCode);
                } catch (e) {
                    gs.error('CAB Poker - Failed to parse string body: ' + e.message);
                }
            }
            // Try dataString parsing
            else if (request.body.dataString) {
                try {
                    if (typeof request.body.dataString === 'object') {
                        sessionCode = request.body.dataString.session_code;
                        gs.info('CAB Poker - Got session code from dataString object: ' + sessionCode);
                    } else {
                        const parsed = JSON.parse(request.body.dataString);
                        sessionCode = parsed.session_code;
                        gs.info('CAB Poker - Parsed dataString, got session code: ' + sessionCode);
                    }
                } catch (e) {
                    gs.error('CAB Poker - Failed to parse dataString: ' + e.message);
                }
            }
        }
        
        // Fallback to query parameters
        if (!sessionCode && request.queryParams && request.queryParams.session_code) {
            sessionCode = request.queryParams.session_code;
            gs.info('CAB Poker - Got session code from query params: ' + sessionCode);
        }
        
        // Fallback to path parameters
        if (!sessionCode && request.pathParams && request.pathParams.session_code) {
            sessionCode = request.pathParams.session_code;
            gs.info('CAB Poker - Got session code from path params: ' + sessionCode);
        }
        
        gs.info('CAB Poker - Final session code extracted: ' + sessionCode);
        
        if (!sessionCode || sessionCode.trim() === '') {
            gs.error('CAB Poker - FINAL ERROR: No session code found anywhere');
            
            // Ultimate debug: log the entire request structure
            gs.error('CAB Poker - ULTIMATE DEBUG: Raw request dump:');
            try {
                for (let key in request) {
                    if (request.hasOwnProperty(key)) {
                        try {
                            gs.error('CAB Poker - Request.' + key + ': ' + JSON.stringify(request[key]).substring(0, 200));
                        } catch (inner) {
                            gs.error('CAB Poker - Request.' + key + ': [object - cannot stringify]');
                        }
                    }
                }
            } catch (e) {
                gs.error('CAB Poker - Cannot iterate request properties: ' + e.message);
            }
            
            response.setStatus(400);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session code not found. Check system logs for full request debug information.'
            }));
            return;
        }
        
        // Continue with session joining logic
        const cleanSessionCode = sessionCode.trim().toUpperCase();
        const userId = gs.getUserID();
        
        if (!userId) {
            response.setStatus(401);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Authentication required'
            }));
            return;
        }
        
        // Find the session
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        sessionGr.addQuery('session_code', cleanSessionCode);
        sessionGr.addQuery('active', true);
        sessionGr.query();
        
        if (!sessionGr.hasNext()) {
            // Debug: List all active sessions
            const debugSessionGr = new GlideRecord('x_1862662_cab_poke_session');
            debugSessionGr.addQuery('active', true);
            debugSessionGr.query();
            const activeSessions = [];
            while (debugSessionGr.next()) {
                activeSessions.push(debugSessionGr.getValue('session_code'));
            }
            
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session not found. Looking for: ' + cleanSessionCode + '. Active sessions: ' + activeSessions.join(', ')
            }));
            return;
        }
        
        sessionGr.next();
        const sessionId = sessionGr.getUniqueValue();
        
        // Check if user is already a participant
        const existingParticipant = new GlideRecord('x_1862662_cab_poke_participant');
        existingParticipant.addQuery('session', sessionId);
        existingParticipant.addQuery('user', userId);
        existingParticipant.query();
        
        if (existingParticipant.hasNext()) {
            // Update existing participant's activity time
            existingParticipant.next();
            existingParticipant.setValue('last_activity', new GlideDateTime());
            existingParticipant.setValue('is_online', true);
            existingParticipant.update();
            
            response.setStatus(200);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                session_id: sessionId,
                participant_id: existingParticipant.getUniqueValue(),
                status: 'rejoined',
                session_code: cleanSessionCode
            }));
        } else {
            // Create new participant
            const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
            participantGr.initialize();
            participantGr.setValue('session', sessionId);
            participantGr.setValue('user', userId);
            participantGr.setValue('join_time', new GlideDateTime());
            participantGr.setValue('last_activity', new GlideDateTime());
            participantGr.setValue('is_online', true);
            participantGr.setValue('has_voted', false);
            
            const participantId = participantGr.insert();
            
            if (participantId) {
                response.setStatus(201);
                response.setContentType('application/json');
                response.getStreamWriter().writeString(JSON.stringify({
                    session_id: sessionId,
                    participant_id: participantId,
                    status: 'joined',
                    session_code: cleanSessionCode
                }));
            } else {
                response.setStatus(500);
                response.setContentType('application/json');
                response.getStreamWriter().writeString(JSON.stringify({
                    error: 'Failed to join session'
                }));
            }
        }
        
    } catch (e) {
        gs.error('CAB Poker - Join Session Exception: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}

// Alternative join session using GET method with session code in path
export function joinSessionAlternative(request, response) {
    try {
        gs.info('CAB Poker - Alternative Join: Using GET method with path parameter');
        
        // Get session code from path parameters
        const sessionCode = request.pathParams && request.pathParams.session_code 
            ? request.pathParams.session_code 
            : null;
            
        gs.info('CAB Poker - Session code from path: ' + sessionCode);
        
        if (!sessionCode) {
            response.setStatus(400);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session code is required in path'
            }));
            return;
        }
        
        const userId = gs.getUserID();
        const cleanSessionCode = sessionCode.trim().toUpperCase();
        
        // Find the session
        const sessionGr = new GlideRecord('x_1862662_cab_poke_session');
        sessionGr.addQuery('session_code', cleanSessionCode);
        sessionGr.addQuery('active', true);
        sessionGr.query();
        
        if (!sessionGr.hasNext()) {
            response.setStatus(404);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Session not found or inactive'
            }));
            return;
        }
        
        sessionGr.next();
        const sessionId = sessionGr.getUniqueValue();
        
        // Create new participant
        const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
        participantGr.initialize();
        participantGr.setValue('session', sessionId);
        participantGr.setValue('user', userId);
        participantGr.setValue('join_time', new GlideDateTime());
        participantGr.setValue('last_activity', new GlideDateTime());
        participantGr.setValue('is_online', true);
        participantGr.setValue('has_voted', false);
        
        const participantId = participantGr.insert();
        
        if (participantId) {
            response.setStatus(201);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                session_id: sessionId,
                participant_id: participantId,
                status: 'joined',
                session_code: cleanSessionCode
            }));
        } else {
            response.setStatus(500);
            response.setContentType('application/json');
            response.getStreamWriter().writeString(JSON.stringify({
                error: 'Failed to join session'
            }));
        }
        
    } catch (e) {
        gs.error('CAB Poker - Alternative Join Error: ' + e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.getStreamWriter().writeString(JSON.stringify({
            error: 'Internal server error: ' + e.message
        }));
    }
}