import '@servicenow/sdk/global'
import { Role } from '@servicenow/sdk/core'

export const cab_poker_chair = Role({
    name: 'x_1862662_cab_poke.cab_poker_chair',
    description: 'CAB Chair role for managing CAB Poker sessions, including starting sessions, revealing votes, and finalizing decisions.',
})

export const cab_poker_member = Role({
    name: 'x_1862662_cab_poke.cab_poker_member',
    description: 'CAB Member role for participating in CAB Poker voting sessions.',
})