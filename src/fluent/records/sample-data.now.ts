import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// NOTE: A seeded "sample session" is intentionally NOT shipped here.
// Reference columns (chair_user -> sys_user) cannot be populated by username — they
// require a sys_id or a Now.ID reference, and the OOTB admin user's sys_id is not
// portable across instances. Sessions are created at runtime via the createSession
// REST endpoint, which sets chair_user from gs.getUserID(). Sample users and change
// requests below are for demo purposes only and are tagged installMethod 'demo'.

// Sample Test Users for CAB Poker - Updated with unique usernames
export const testUser1 = Record({
    $id: Now.ID['test-user-1'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.chair.alice2024',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice.johnson.cabpoker@company.com',
        title: 'CAB Chair - Test User',
        active: true,
        locked_out: false
    }
})

export const testUser2 = Record({
    $id: Now.ID['test-user-2'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.member.bob2024',
        first_name: 'Bob',
        last_name: 'Smith',
        email: 'bob.smith.cabpoker@company.com',
        title: 'Senior Developer - Test User',
        active: true,
        locked_out: false
    }
})

export const testUser3 = Record({
    $id: Now.ID['test-user-3'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.member.carol2024',
        first_name: 'Carol',
        last_name: 'Williams',
        email: 'carol.williams.cabpoker@company.com',
        title: 'IT Manager - Test User',
        active: true,
        locked_out: false
    }
})

export const testUser4 = Record({
    $id: Now.ID['test-user-4'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.member.david2024',
        first_name: 'David',
        last_name: 'Brown',
        email: 'david.brown.cabpoker@company.com',
        title: 'System Administrator - Test User',
        active: true,
        locked_out: false
    }
})

export const testUser5 = Record({
    $id: Now.ID['test-user-5'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.member.emily2024',
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis.cabpoker@company.com',
        title: 'Business Analyst - Test User',
        active: true,
        locked_out: false
    }
})

export const testUser6 = Record({
    $id: Now.ID['test-user-6'],
    table: 'sys_user',
    data: {
        user_name: 'cabpoker.member.frank2024',
        first_name: 'Frank',
        last_name: 'Miller',
        email: 'frank.miller.cabpoker@company.com',
        title: 'Operations Manager - Test User',
        active: true,
        locked_out: false
    }
})

// 10 Sample Change Requests for CAB Poker Testing - Using correct numeric state values
export const changeRequest1 = Record({
    $id: Now.ID['cr-sample-1'],
    table: 'change_request',
    data: {
        short_description: 'Upgrade Production Database Server to Oracle 19c',
        description: 'Migrate production database from Oracle 11g to Oracle 19c to improve performance, security, and add new features. Requires 4-hour maintenance window during off-peak hours.',
        category: 'software',
        state: -4, // Assess
        justification: 'Critical security patches and performance improvements needed for compliance.',
        implementation_plan: 'Phase 1: Backup current DB, Phase 2: Install Oracle 19c, Phase 3: Migrate data, Phase 4: Testing and validation'
    }
})

export const changeRequest2 = Record({
    $id: Now.ID['cr-sample-2'],
    table: 'change_request',
    data: {
        short_description: 'Deploy New Customer Portal Authentication System',
        description: 'Implement multi-factor authentication for customer portal to enhance security. Includes integration with existing Active Directory and new SMS verification service.',
        category: 'software',
        state: -4, // Assess
        justification: 'Security enhancement required due to recent cyber security audit findings.',
        implementation_plan: 'Weekend deployment with rollback plan. User communication 48hrs in advance.'
    }
})

export const changeRequest3 = Record({
    $id: Now.ID['cr-sample-3'],
    table: 'change_request',
    data: {
        short_description: 'Network Infrastructure Upgrade - Core Switch Replacement',
        description: 'Replace aging core network switches in main data center with high-performance models. Will provide better bandwidth and redundancy for critical business operations.',
        category: 'hardware',
        state: -4, // Assess
        justification: 'Current switches are end-of-life and showing performance degradation.',
        implementation_plan: 'Phased replacement during maintenance windows to minimize downtime.'
    }
})

export const changeRequest4 = Record({
    $id: Now.ID['cr-sample-4'],
    table: 'change_request',
    data: {
        short_description: 'Update Employee Laptop Operating Systems to Windows 11',
        description: 'Mass deployment of Windows 11 to all employee laptops to maintain security support and access to latest productivity features. Includes data migration and software compatibility testing.',
        category: 'software',
        state: -4, // Assess
        justification: 'Windows 10 support ending soon. Security and compliance requirement.',
        implementation_plan: 'Staged rollout by department over 6 weeks with user training sessions.'
    }
})

export const changeRequest5 = Record({
    $id: Now.ID['cr-sample-5'],
    table: 'change_request',
    data: {
        short_description: 'Implement New Cloud Backup Solution',
        description: 'Deploy enterprise cloud backup solution to replace aging on-premises backup infrastructure. Will provide better disaster recovery capabilities and cost savings.',
        category: 'software',
        state: -4, // Assess
        justification: 'Current backup solution is unreliable and lacks cloud integration.',
        implementation_plan: 'Parallel deployment with existing system for 30 days before cutover.'
    }
})

export const changeRequest6 = Record({
    $id: Now.ID['cr-sample-6'],
    table: 'change_request',
    data: {
        short_description: 'Firewall Rules Update for New Partner Integration',
        description: 'Configure firewall rules to allow secure communication with new business partner systems. Includes VPN tunnel setup and access controls for specific IP ranges and ports.',
        category: 'network',
        state: -4, // Assess
        justification: 'Required for new strategic partnership and revenue stream.',
        implementation_plan: 'Standard firewall change process with security team approval.'
    }
})

export const changeRequest7 = Record({
    $id: Now.ID['cr-sample-7'],
    table: 'change_request',
    data: {
        short_description: 'Emergency Security Patch for Web Application',
        description: 'Apply critical security patch to customer-facing web application to address recently discovered vulnerability. Zero-day exploit protection required immediately.',
        category: 'software',
        state: -4, // Assess
        justification: 'Critical security vulnerability with active exploits in the wild.',
        implementation_plan: 'Emergency change - immediate deployment with full rollback capability.'
    }
})

export const changeRequest8 = Record({
    $id: Now.ID['cr-sample-8'],
    table: 'change_request',
    data: {
        short_description: 'Email System Migration to Office 365',
        description: 'Migrate entire email infrastructure from on-premises Exchange to Microsoft Office 365. Includes mailbox migration, DNS changes, and user training.',
        category: 'software',
        state: -4, // Assess
        justification: 'Cost reduction and improved collaboration features. Better disaster recovery.',
        implementation_plan: 'Phased migration by department over 4 weeks with hybrid configuration.'
    }
})

export const changeRequest9 = Record({
    $id: Now.ID['cr-sample-9'],
    table: 'change_request',
    data: {
        short_description: 'Mobile Device Management System Upgrade',
        description: 'Upgrade mobile device management platform to latest version with enhanced security features and support for new device types including tablets and IoT devices.',
        category: 'software',
        state: -4, // Assess
        justification: 'Current version lacks support for new devices and security features.',
        implementation_plan: 'After-hours upgrade with device re-enrollment over following week.'
    }
})

export const changeRequest10 = Record({
    $id: Now.ID['cr-sample-10'],
    table: 'change_request',
    data: {
        short_description: 'Data Center Power System Redundancy Installation',
        description: 'Install additional UPS units and backup generators in primary data center to improve power redundancy and eliminate single points of failure.',
        category: 'hardware',
        state: -4, // Assess
        justification: 'Business continuity requirement. Recent power outages caused significant downtime.',
        implementation_plan: 'Installation during scheduled maintenance window with temporary generator backup.'
    }
})