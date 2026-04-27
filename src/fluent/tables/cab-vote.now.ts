import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, DateTimeColumn, IntegerColumn } from '@servicenow/sdk/core'

export const x_1862662_cab_poke_vote = Table({
    name: 'x_1862662_cab_poke_vote',
    label: 'CAB Vote',
    schema: {
        session: ReferenceColumn({
            label: 'Session',
            referenceTable: 'x_1862662_cab_poke_session',
            mandatory: true,
        }),
        participant: ReferenceColumn({
            label: 'Participant',
            referenceTable: 'x_1862662_cab_poke_participant',
            mandatory: true,
        }),
        user: ReferenceColumn({
            label: 'User',
            referenceTable: 'sys_user',
            mandatory: true,
        }),
        risk_vote: StringColumn({
            label: 'Risk Vote',
            choices: {
                low: { label: 'Low', sequence: 0 },
                medium: { label: 'Medium', sequence: 1 },
                high: { label: 'High', sequence: 2 },
                critical: { label: 'Critical', sequence: 3 },
            },
            dropdown: 'dropdown_with_none',
        }),
        impact_vote: IntegerColumn({
            label: 'Impact Vote',
            min: 1,
            max: 5,
        }),
        recommendation_vote: StringColumn({
            label: 'Recommendation Vote',
            choices: {
                approve: { label: 'Approve', sequence: 0 },
                approve_conditions: { label: 'Approve with Conditions', sequence: 1 },
                reject: { label: 'Reject', sequence: 2 },
                defer: { label: 'Defer', sequence: 3 },
            },
            dropdown: 'dropdown_with_none',
        }),
        vote_time: DateTimeColumn({
            label: 'Vote Time',
        }),
    },
    actions: ['create', 'read', 'update', 'delete'],
    accessible_from: 'public',
    caller_access: 'tracking',
    allow_web_service_access: true,
    display: 'user',
})