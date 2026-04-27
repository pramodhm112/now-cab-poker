import { gs, GlideRecord } from '@servicenow/glide'

// Map our session risk choices -> OOTB change_request.risk integer values
// OOTB change_request.risk: 2 = High, 3 = Moderate, 4 = Low
// We add a 'critical' bucket which maps to High (2) since OOTB has no critical
const RISK_MAP = {
    low: '4',
    medium: '3',
    high: '2',
    critical: '2'
};

// Map our 1..5 impact scale -> OOTB change_request.impact integer values
// OOTB change_request.impact: 1 = High, 2 = Medium, 3 = Low
const IMPACT_MAP = {
    '1': '3',
    '2': '3',
    '3': '2',
    '4': '1',
    '5': '1'
};

const RECOMMENDATION_LABELS = {
    approve: 'Approve',
    approve_conditions: 'Approve with Conditions',
    reject: 'Reject',
    defer: 'Defer'
};

const RISK_LABELS = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
};

export function updateChangeRequestFromSession(current, previous) {
    if (current.getValue('session_status') !== 'completed') {
        return;
    }
    if (previous && previous.getValue('session_status') === 'completed') {
        return;
    }

    const changeRequestId = current.getValue('change_request');
    const finalRisk = current.getValue('final_risk');
    const finalImpact = current.getValue('final_impact');
    const finalRecommendation = current.getValue('final_recommendation');
    const sessionCode = current.getValue('session_code');
    const sessionId = current.getUniqueValue();

    if (!changeRequestId) {
        gs.info('CAB Poker: No change request associated with completed session ' + sessionId);
        return;
    }
    if (!finalRisk || !finalImpact || !finalRecommendation) {
        gs.warn('CAB Poker: Session completed without final values set for session ' + sessionId);
        return;
    }

    try {
        gs.info('CAB Poker BR: firing for session ' + sessionId +
            ' (code=' + sessionCode + ', cr=' + changeRequestId +
            ', risk=' + finalRisk + ', impact=' + finalImpact +
            ', recommendation=' + finalRecommendation + ')');

        const crGr = new GlideRecord('change_request');
        if (!crGr.get(changeRequestId)) {
            gs.error('CAB Poker: Could not find change request ' + changeRequestId);
            return;
        }

        const mappedRisk = RISK_MAP[finalRisk];
        const mappedImpact = IMPACT_MAP[String(finalImpact)];
        if (mappedRisk) {
            crGr.setValue('risk', mappedRisk);
        }
        if (mappedImpact) {
            crGr.setValue('impact', mappedImpact);
        }

        const voteCount = getVoteCount(sessionId);
        const voteSummary = generateVoteSummary(sessionId);

        const workNote =
            'CAB Poker Session Completed\n' +
            'Session Code: ' + sessionCode + '\n' +
            'Participants: ' + voteCount.total + '\n' +
            'Votes Submitted: ' + voteCount.voted + '\n\n' +
            'Final Decisions:\n' +
            '- Risk: ' + (RISK_LABELS[finalRisk] || finalRisk) + '\n' +
            '- Impact: ' + finalImpact + '\n' +
            '- Recommendation: ' + (RECOMMENDATION_LABELS[finalRecommendation] || finalRecommendation) + '\n\n' +
            'Vote Distribution:\n' + voteSummary;

        // Property assignment (not setValue) is the more reliable idiom for
        // journal fields like work_notes when written from a cross-scope BR.
        crGr.work_notes = workNote;
        const updated = crGr.update();

        if (updated) {
            gs.info('CAB Poker BR: updated change request ' + changeRequestId +
                ' with session results (work_notes length=' + workNote.length + ')');
        } else {
            gs.error('CAB Poker BR: crGr.update() returned falsy for ' + changeRequestId +
                ' — likely cross-scope ACL or write-restricted state. Last error: ' +
                (crGr.getLastErrorMessage ? crGr.getLastErrorMessage() : 'n/a'));
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
        // Server-side getValue() returns '0'/'1' for boolean fields, not 'true'/'false'.
        if (participantGr.getValue('has_voted') === '1') {
            voted++;
        }
    }
    return { total: total, voted: voted };
}

function generateVoteSummary(sessionId) {
    const voteGr = new GlideRecord('x_1862662_cab_poke_vote');
    voteGr.addQuery('session', sessionId);
    voteGr.query();

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const impactCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const recommendationCounts = { approve: 0, approve_conditions: 0, reject: 0, defer: 0 };

    while (voteGr.next()) {
        const risk = voteGr.getValue('risk_vote');
        const impact = voteGr.getValue('impact_vote');
        const recommendation = voteGr.getValue('recommendation_vote');

        if (risk && riskCounts.hasOwnProperty(risk)) riskCounts[risk]++;
        if (impact && impactCounts.hasOwnProperty(impact)) impactCounts[impact]++;
        if (recommendation && recommendationCounts.hasOwnProperty(recommendation)) recommendationCounts[recommendation]++;
    }

    let summary = 'Risk Votes:\n';
    for (const key in riskCounts) {
        if (riskCounts[key] > 0) {
            summary += '  ' + (RISK_LABELS[key] || key) + ': ' + riskCounts[key] + '\n';
        }
    }

    summary += '\nImpact Votes:\n';
    for (const key in impactCounts) {
        if (impactCounts[key] > 0) {
            summary += '  Impact ' + key + ': ' + impactCounts[key] + '\n';
        }
    }

    summary += '\nRecommendation Votes:\n';
    for (const key in recommendationCounts) {
        if (recommendationCounts[key] > 0) {
            summary += '  ' + (RECOMMENDATION_LABELS[key] || key) + ': ' + recommendationCounts[key] + '\n';
        }
    }
    return summary;
}