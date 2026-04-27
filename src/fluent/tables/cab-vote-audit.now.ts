import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, DateTimeColumn } from '@servicenow/sdk/core'

export const x_1862662_cab_poke_vote_audit = Table({
    name: 'x_1862662_cab_poke_vote_audit',
    label: 'CAB Vote Audit',
    schema: {
        session: ReferenceColumn({
            label: 'Session',
            referenceTable: 'x_1862662_cab_poke_session',
            mandatory: true,
        }),
        user: ReferenceColumn({
            label: 'User',
            referenceTable: 'sys_user',
        }),
        action: StringColumn({
            label: 'Action',
            choices: {
                start_voting: { label: 'Start Voting', sequence: 0 },
                submit_vote: { label: 'Submit Vote', sequence: 1 },
                update_vote: { label: 'Update Vote', sequence: 2 },
                reveal_votes: { label: 'Reveal Votes', sequence: 3 },
                finalize: { label: 'Finalize', sequence: 4 },
            },
            dropdown: 'dropdown_with_none',
        }),
        event_time: DateTimeColumn({
            label: 'Event Time',
        }),
        details: StringColumn({
            label: 'Details (JSON)',
            maxLength: 4000,
        }),
    },
    actions: ['create', 'read'],
    accessible_from: 'public',
    caller_access: 'tracking',
    allow_web_service_access: true,
    display: 'action',
})
