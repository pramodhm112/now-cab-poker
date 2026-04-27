import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { updateChangeRequestFromSession } from '../../server/business-rules/session-completion.js'

export const sessionCompletionRule = BusinessRule({
    $id: Now.ID['session-completion-br'],
    name: 'CAB Session Completion Handler',
    table: 'x_1862662_cab_poke_session',
    when: 'after',
    action: ['update'],
    script: updateChangeRequestFromSession,
    order: 100,
    active: true,
    description: 'Updates change request when CAB session is completed with final risk, impact, and recommendation values'
})