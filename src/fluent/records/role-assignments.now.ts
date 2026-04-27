import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// sys_user_has_role grants for the seeded test users.
// Tagged installMethod: 'demo' so they only deploy when demo data is requested.
//
// Role sys_ids are deterministic from the SDK build (scope + role name hash)
// and are what keys.ts already records for x_1862662_cab_poke.cab_poker_chair
// and x_1862662_cab_poke.cab_poker_member.
const CHAIR_ROLE_SYS_ID = '80abef5c8e5a47bc80a687c05713ef80'
const MEMBER_ROLE_SYS_ID = '6c1709beb66741b3834b8698ddd887ed'

// Alice (cabpoker.chair.alice2024) — CAB Chair
export const grantChairAlice = Record({
    $id: Now.ID['grant-chair-alice'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-1'],
        role: CHAIR_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})

// Bob (cabpoker.member.bob2024) — Member
export const grantMemberBob = Record({
    $id: Now.ID['grant-member-bob'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-2'],
        role: MEMBER_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})

// Carol (cabpoker.member.carol2024) — Member
export const grantMemberCarol = Record({
    $id: Now.ID['grant-member-carol'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-3'],
        role: MEMBER_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})

// David (cabpoker.member.david2024) — Member
export const grantMemberDavid = Record({
    $id: Now.ID['grant-member-david'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-4'],
        role: MEMBER_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})

// Emily (cabpoker.member.emily2024) — Member
export const grantMemberEmily = Record({
    $id: Now.ID['grant-member-emily'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-5'],
        role: MEMBER_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})

// Frank (cabpoker.member.frank2024) — Member
export const grantMemberFrank = Record({
    $id: Now.ID['grant-member-frank'],
    table: 'sys_user_has_role',
    data: {
        user: Now.ID['test-user-6'],
        role: MEMBER_ROLE_SYS_ID,
    },
    $meta: { installMethod: 'demo' },
})
