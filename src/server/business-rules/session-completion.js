import { gs, GlideRecord } from '@servicenow/glide'

export function updateChangeRequestFromSession(current, previous) {
    // Only proceed if this session is being completed and has final values
    if (current.getValue('session_status') !== 'completed') {
        return;
    }
    
    // Check if we have a change request and final values
    const changeRequestId = current.getValue('change_request');
    const finalRisk = current.getValue('final_risk');
    const finalImpact = current.getValue('final_impact');
    const finalRecommendation = current.getValue('final_recommendation');
    
    if (!changeRequestId) {
        gs.info('CAB Poker: No change request associated with completed session ' + current.getUniqueValue());
        return;
    }
    
    if (!finalRisk || !finalImpact || !finalRecommendation) {
        gs.warn('CAB Poker: Session completed without final values set for session ' + current.getUniqueValue());
        return;
    }
    
    try {
        // Update the change request
        const crGr = new GlideRecord('change_request');
        if (crGr.get(changeRequestId)) {
            // Update risk and impact
            crGr.risk = finalRisk;
            crGr.impact = finalImpact;
            
            // Create work note with voting summary
            const voteCount = getVoteCount(current.getUniqueValue());
            const voteSummary = generateVoteSummary(current.getUniqueValue());
            
            const workNote = `CAB Poker Session Completed\\n` +
                `Session Code: ${current.getValue('session_code')}\\n` +
                `Participants: ${voteCount.total}\\n` +
                `Votes Submitted: ${voteCount.voted}\\n\\n` +
                `Final Decisions:\\n` +
                `- Risk: ${finalRisk}\\n` +
                `- Impact: ${finalImpact}\\n` +
                `- Recommendation: ${finalRecommendation}\\n\\n` +
                `Vote Distribution:\\n${voteSummary}`;
            
            crGr.work_notes = workNote;
            crGr.update();
            
            gs.info('CAB Poker: Updated change request ' + changeRequestId + ' with session results');
        } else {
            gs.error('CAB Poker: Could not find change request ' + changeRequestId);
        }
        
    } catch (e) {
        gs.error('CAB Poker: Error updating change request: ' + e.message);
    }
}

function getVoteCount(sessionId) {
    const participantGr = new GlideRecord('x_1862662_cab_poke_participant');
    participantGr.addQuery('session', sessionId);
    participantGr.query();
    
    let total = 0;
    let voted = 0;
    
    while (participantGr.next()) {
        total++;
        if (participantGr.getValue('has_voted') === 'true') {
            voted++;
        }
    }
    
    return { total, voted };
}

function generateVoteSummary(sessionId) {
    const voteGr = new GlideRecord('x_1862662_cab_poke_vote');
    voteGr.addQuery('session', sessionId);
    voteGr.query();
    
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const impactCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const recommendationCounts = { approve: 0, approve_conditions: 0, reject: 0, defer: 0 };
    
    while (voteGr.next()) {
        const risk = voteGr.getValue('risk_vote');
        const impact = voteGr.getValue('impact_vote');
        const recommendation = voteGr.getValue('recommendation_vote');
        
        if (risk) riskCounts[risk]++;
        if (impact) impactCounts[impact]++;
        if (recommendation) recommendationCounts[recommendation]++;
    }
    
    let summary = 'Risk Votes:\\n';
    Object.entries(riskCounts).forEach(([key, value]) => {
        if (value > 0) {
            summary += `  ${key}: ${value}\\n`;
        }
    });
    
    summary += '\\nImpact Votes:\\n';
    Object.entries(impactCounts).forEach(([key, value]) => {
        if (value > 0) {
            summary += `  ${key}: ${value}\\n`;
        }
    });
    
    summary += '\\nRecommendation Votes:\\n';
    Object.entries(recommendationCounts).forEach(([key, value]) => {
        if (value > 0) {
            const displayKey = key.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase());
            summary += `  ${displayKey}: ${value}\\n`;
        }
    });
    
    return summary;
}