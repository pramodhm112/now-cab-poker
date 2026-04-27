import '@servicenow/sdk/global'
import { Acl } from '@servicenow/sdk/core'

// ACL for CAB Session table - Read access
export const cabSessionReadAcl = Acl({
    $id: Now.ID['cab-session-read-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_session',
    operation: 'read',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to read session records'
})

// ACL for CAB Session table - Create access (chairs only)
export const cabSessionCreateAcl = Acl({
    $id: Now.ID['cab-session-create-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_session',
    operation: 'create',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair'],
    description: 'Allow CAB Chairs to create session records'
})

// ACL for CAB Session table - Update access (chairs only)
export const cabSessionUpdateAcl = Acl({
    $id: Now.ID['cab-session-update-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_session',
    operation: 'write',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair'],
    description: 'Allow CAB Chairs to update session records'
})

// ACL for CAB Participant table - Read access
export const cabParticipantReadAcl = Acl({
    $id: Now.ID['cab-participant-read-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_participant',
    operation: 'read',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to read participant records'
})

// ACL for CAB Participant table - Create access
export const cabParticipantCreateAcl = Acl({
    $id: Now.ID['cab-participant-create-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_participant',
    operation: 'create',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to create participant records'
})

// ACL for CAB Participant table - Update access
export const cabParticipantUpdateAcl = Acl({
    $id: Now.ID['cab-participant-update-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_participant',
    operation: 'write',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to update participant records'
})

// ACL for CAB Vote table - Read access
export const cabVoteReadAcl = Acl({
    $id: Now.ID['cab-vote-read-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_vote',
    operation: 'read',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to read vote records'
})

// ACL for CAB Vote table - Create access
export const cabVoteCreateAcl = Acl({
    $id: Now.ID['cab-vote-create-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_vote',
    operation: 'create',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to create vote records'
})

// ACL for CAB Vote table - Update access
export const cabVoteUpdateAcl = Acl({
    $id: Now.ID['cab-vote-update-acl'],
    type: 'record',
    table: 'x_1862662_cab_poke_vote',
    operation: 'write',
    active: true,
    admin_overrides: true,
    roles: ['x_1862662_cab_poke.cab_poker_chair', 'x_1862662_cab_poke.cab_poker_member'],
    description: 'Allow CAB Poker users to update vote records'
})