import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn, BooleanColumn, DateTimeColumn, IntegerColumn } from '@servicenow/sdk/core'

export const x_1862662_cab_poke_session = Table({
    name: 'x_1862662_cab_poke_session',
    label: 'CAB Session',
    schema: {
        session_code: StringColumn({
            label: 'Session Code',
            maxLength: 6,
            mandatory: true,
        }),
        chair_user: ReferenceColumn({
            label: 'CAB Chair',
            referenceTable: 'sys_user',
            mandatory: true,
        }),
        change_request: ReferenceColumn({
            label: 'Change Request',
            referenceTable: 'change_request',
        }),
        session_status: StringColumn({
            label: 'Status',
            choices: {
                waiting: { label: 'Waiting for Members', sequence: 0 },
                voting: { label: 'Voting in Progress', sequence: 1 },
                revealing: { label: 'Revealing Results', sequence: 2 },
                completed: { label: 'Completed', sequence: 3 },
                cancelled: { label: 'Cancelled', sequence: 4 },
            },
            dropdown: 'dropdown_with_none',
            default: 'waiting',
        }),
        voting_timer: IntegerColumn({
            label: 'Voting Timer (seconds)',
            default: '30',
        }),
        voting_start_time: DateTimeColumn({
            label: 'Voting Start Time',
        }),
        active: BooleanColumn({
            label: 'Active',
            default: 'true',
        }),
        final_risk: StringColumn({
            label: 'Final Risk Assessment',
            choices: {
                low: { label: 'Low', sequence: 0 },
                medium: { label: 'Medium', sequence: 1 },
                high: { label: 'High', sequence: 2 },
                critical: { label: 'Critical', sequence: 3 },
            },
            dropdown: 'dropdown_with_none',
        }),
        final_impact: IntegerColumn({
            label: 'Final Impact',
            min: 1,
            max: 5,
        }),
        final_recommendation: StringColumn({
            label: 'Final Recommendation',
            choices: {
                approve: { label: 'Approve', sequence: 0 },
                approve_conditions: { label: 'Approve with Conditions', sequence: 1 },
                reject: { label: 'Reject', sequence: 2 },
                defer: { label: 'Defer', sequence: 3 },
            },
            dropdown: 'dropdown_with_none',
        }),
    },
    actions: ['create', 'read', 'update', 'delete'],
    accessible_from: 'public',
    caller_access: 'tracking',
    allow_web_service_access: true,
    display: 'session_code',
})