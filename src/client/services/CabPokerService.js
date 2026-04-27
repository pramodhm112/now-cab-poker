export class CabPokerService {
    constructor() {
        // ServiceNow scoped REST API URL format
        this.baseUrl = '/api/x_1862662_cab_poke/cab_poker';
    }

    async createSession(votingTimer = 30) {
        try {
            console.log('Making request to:', `${this.baseUrl}/session`);
            console.log('Request payload:', { voting_timer: votingTimer });
            
            // Try different request formats for ServiceNow compatibility
            const requestBody = JSON.stringify({ voting_timer: votingTimer });
            console.log('JSON request body:', requestBody);
            
            const response = await fetch(`${this.baseUrl}/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                },
                body: requestBody
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
            
            let responseText = '';
            try {
                responseText = await response.text();
                console.log('Raw response text:', responseText);
            } catch (textError) {
                console.error('Could not read response text:', textError);
            }
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        console.log('Error response data:', errorData);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                        console.error('Could not parse error response:', parseError);
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            let data = {};
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                    console.log('Success response data:', data);
                } catch (parseError) {
                    console.error('Could not parse success response:', parseError);
                    throw new Error('Invalid response format from server');
                }
            }
            
            return data;
        } catch (error) {
            console.error('Error creating session:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while creating session');
            }
        }
    }

    async joinSession(sessionCode) {
        console.group('🔗 CAB Poker - Joining Session');
        console.log('Session code:', sessionCode);
        console.log('Base URL:', this.baseUrl);
        console.log('🚀 Method 1: POST with JSON body');
        
        try {
            const requestData = { session_code: sessionCode };
            const requestBody = JSON.stringify(requestData);
            
            console.log('Request data object:', requestData);
            console.log('JSON request body:', requestBody);
            console.log('Request body length:', requestBody.length);
            
            const response = await fetch(`${this.baseUrl}/session/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                },
                body: requestBody
            });
            
            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            if (response.ok) {
                const data = JSON.parse(responseText);
                console.log('✅ Method 1 succeeded:', data);
                console.groupEnd();
                return data;
            } else {
                console.log('❌ Method 1 failed, trying alternative...');
                
                // Try alternative method: GET with session code in path
                console.log('🚀 Method 2: GET with path parameter');
                const altResponse = await fetch(`${this.baseUrl}/join/${sessionCode}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-UserToken': window.g_ck || ''
                    }
                });
                
                console.log('Alternative response status:', altResponse.status);
                const altResponseText = await altResponse.text();
                console.log('Alternative response text:', altResponseText);
                
                if (altResponse.ok) {
                    const altData = JSON.parse(altResponseText);
                    console.log('✅ Method 2 succeeded:', altData);
                    console.groupEnd();
                    return altData;
                } else {
                    console.log('❌ Method 2 also failed');
                }
                
                // All methods failed, parse the original error
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    errorMessage = responseText || errorMessage;
                }
                
                console.error('❌ All methods failed. Final error:', errorMessage);
                console.groupEnd();
                throw new Error(errorMessage);
            }
            
        } catch (error) {
            console.error('❌ Critical error in joinSession:', error);
            console.groupEnd();
            
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while joining session');
            }
        }
    }

    // Safe session loading that doesn't throw errors
    async getSessionSafely(sessionId) {
        try {
            const response = await fetch(`/api/now/table/x_1862662_cab_poke_session/${sessionId}?sysparm_display_value=all`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            if (response.ok) {
                const responseText = await response.text();
                const data = JSON.parse(responseText);
                return data.result;
            } else {
                console.warn('Could not load session data from Table API, status:', response.status);
                return null;
            }
        } catch (error) {
            console.warn('Session data loading failed, but continuing:', error.message);
            return null;
        }
    }

    // Helper method to get session details using Table API (throws errors)
    async getSession(sessionId) {
        try {
            const response = await fetch(`/api/now/table/x_1862662_cab_poke_session/${sessionId}?sysparm_display_value=all`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            const responseText = await response.text();
            console.log('Session API response:', response.status, responseText);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error?.message || errorData.message || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            return data.result;
        } catch (error) {
            console.error('Error getting session:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while getting session');
            }
        }
    }

    async startVoting(sessionId, changeRequestId) {
        try {
            const response = await fetch(`${this.baseUrl}/session/${sessionId}/start-voting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                },
                body: JSON.stringify({ change_request_id: changeRequestId })
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            return data;
        } catch (error) {
            console.error('Error starting voting:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while starting voting');
            }
        }
    }

    async submitVote(sessionId, riskVote, impactVote, recommendationVote) {
        try {
            const response = await fetch(`${this.baseUrl}/session/${sessionId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                },
                body: JSON.stringify({
                    risk_vote: riskVote,
                    impact_vote: impactVote,
                    recommendation_vote: recommendationVote
                })
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            return data;
        } catch (error) {
            console.error('Error submitting vote:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while submitting vote');
            }
        }
    }

    async finalizeSession(sessionId, finalRisk, finalImpact, finalRecommendation) {
        const response = await fetch(`${this.baseUrl}/session/${sessionId}/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserToken': window.g_ck || ''
            },
            body: JSON.stringify({
                final_risk: finalRisk,
                final_impact: finalImpact,
                final_recommendation: finalRecommendation
            })
        });
        const text = await response.text();
        if (!response.ok) {
            let msg = `HTTP ${response.status}: ${response.statusText}`;
            try { msg = (JSON.parse(text).error) || msg; } catch (_) { msg = text || msg; }
            throw new Error(msg);
        }
        return text ? JSON.parse(text) : {};
    }

    async revealVotes(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/session/${sessionId}/reveal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            return data;
        } catch (error) {
            console.error('Error revealing votes:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while revealing votes');
            }
        }
    }

    // Enhanced method to get change request details with better error handling
    async getChangeRequest(changeRequestId) {
        try {
            console.log('Fetching change request:', changeRequestId);
            
            // Validate the ID format
            if (!changeRequestId || typeof changeRequestId !== 'string') {
                throw new Error('Invalid change request ID provided');
            }
            
            // Clean the ID (remove any whitespace)
            const cleanId = changeRequestId.trim();
            console.log('Clean change request ID:', cleanId);
            
            const url = `/api/now/table/change_request/${cleanId}?sysparm_display_value=all&sysparm_fields=sys_id,number,short_description,description,risk,impact,priority,state,category`;
            console.log('Change request URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            const responseText = await response.text();
            console.log('Change request response status:', response.status);
            console.log('Change request response text:', responseText);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error?.message || errorData.message || errorMessage;
                        
                        // Specific handling for 404 errors
                        if (response.status === 404) {
                            errorMessage = `Change request with ID '${cleanId}' not found. Please verify the sys_id is correct.`;
                        }
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = JSON.parse(responseText);
            
            // Check if result exists
            if (!data.result) {
                throw new Error(`Change request with ID '${cleanId}' not found in the system.`);
            }
            
            console.log('Change request data:', data.result);
            return data.result;
        } catch (error) {
            console.error('Error getting change request:', error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Unknown error occurred while getting change request');
            }
        }
    }

    // Method to search for change requests by number (helpful for testing)
    async searchChangeRequestByNumber(changeNumber) {
        try {
            console.log('Searching for change request by number:', changeNumber);
            
            const url = `/api/now/table/change_request?sysparm_query=number=${changeNumber}&sysparm_display_value=all&sysparm_fields=sys_id,number,short_description,description,risk,impact,priority,state&sysparm_limit=1`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                throw new Error(`Failed to search change requests: ${response.status} ${response.statusText}`);
            }

            const data = JSON.parse(responseText);
            
            if (data.result && data.result.length > 0) {
                return data.result[0];
            } else {
                throw new Error(`No change request found with number '${changeNumber}'`);
            }
        } catch (error) {
            console.error('Error searching change request:', error);
            throw error;
        }
    }

    // Method to get all available change requests for selection
    async getAvailableChangeRequests() {
        try {
            const url = `/api/now/table/change_request?sysparm_query=state=-4^ORstate=-3&sysparm_display_value=all&sysparm_fields=sys_id,number,short_description,priority,risk,impact&sysparm_limit=20&sysparm_orderby=priority`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                throw new Error(`Failed to get change requests: ${response.status} ${response.statusText}`);
            }

            const data = JSON.parse(responseText);
            return data.result || [];
        } catch (error) {
            console.error('Error getting available change requests:', error);
            throw error;
        }
    }

    // Helper method to get session participants - also using safe approach
    async getParticipants(sessionId) {
        try {
            const response = await fetch(`/api/now/table/x_1862662_cab_poke_participant?sysparm_query=session=${sessionId}&sysparm_display_value=all`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            
            if (response.ok) {
                const responseText = await response.text();
                const data = JSON.parse(responseText);
                return data.result || [];
            } else {
                console.warn('Could not load participants, status:', response.status);
                return [];
            }
        } catch (error) {
            console.warn('Participants loading failed:', error.message);
            return [];
        }
    }
}