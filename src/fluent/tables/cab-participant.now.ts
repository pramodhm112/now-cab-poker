import '@servicenow/sdk/global'
import { Table, ReferenceColumn, BooleanColumn, DateTimeColumn } from '@servicenow/sdk/core'

export const x_1862662_cab_poke_participant = Table({
    name: 'x_1862662_cab_poke_participant',
    label: 'CAB Participant',
    schema: {
        session: ReferenceColumn({
            label: 'Session',
            referenceTable: 'x_1862662_cab_poke_session',
            mandatory: true,
        }),
        user: ReferenceColumn({
            label: 'User',
            referenceTable: 'sys_user',
            mandatory: true,
        }),
        join_time: DateTimeColumn({
            label: 'Join Time',
        }),
        last_activity: DateTimeColumn({
            label: 'Last Activity',
        }),
        is_online: BooleanColumn({
            label: 'Online Status',
            default: 'true',
        }),
        has_voted: BooleanColumn({
            label: 'Has Voted',
            default: 'false',
        }),
    },
    actions: ['create', 'read', 'update', 'delete'],
    accessible_from: 'public',
    caller_access: 'tracking',
    allow_web_service_access: true,
    display: 'user',
})