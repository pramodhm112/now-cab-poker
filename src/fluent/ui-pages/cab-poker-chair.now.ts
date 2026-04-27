import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import chairPage from '../../client/chair.html'
import memberPage from '../../client/member.html'

export const cab_poker_chair_page = UiPage({
    $id: Now.ID['cab-poker-chair-page'],
    endpoint: 'x_1862662_cab_poke_chair.do',
    description: 'CAB Poker Chair Dashboard - Create and manage CAB voting sessions',
    category: 'general',
    html: chairPage,
    direct: true
})

export const cab_poker_member_page = UiPage({
    $id: Now.ID['cab-poker-member-page'],
    endpoint: 'x_1862662_cab_poke_member.do',
    description: 'CAB Poker Member Interface - Join sessions and cast votes',
    category: 'general',
    html: memberPage,
    direct: true
})