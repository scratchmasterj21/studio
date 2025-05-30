
export default {
  header: {
    greeting: 'Hello',
    newTicket: 'New Ticket',
    manageUsers: 'Manage Users',
    adminOverview: 'Admin Overview',
    profile: 'Profile',
    signOut: 'Sign Out',
    language: 'Language',
    appName: 'FireDesk', // Added for metadata
  },
  loginPage: {
    title: 'FireDesk',
    description: 'Sign in to access the help desk.',
    signInButton: 'Sign in with Google',
    terms: 'By signing in, you agree to our terms of service.',
    footer: '© {year} FireDesk. All rights reserved.',
  },
  dashboardPage: {
    allTicketsManagement: 'All Tickets Management',
    myAssignedTickets: 'My Assigned Tickets',
    mySubmittedTickets: 'My Submitted Tickets',
    createTicketButton: 'Create New Ticket',
    filtersAndSearch: 'Filters & Search',
    filterDescription: 'Filter tickets by status, priority, or search by title/description.',
    searchPlaceholder: 'Search by title or description...',
    statusLabel: 'Status',
    statusPlaceholder: 'Filter by Status',
    allStatuses: 'All Statuses',
    priorityLabel: 'Priority',
    priorityPlaceholder: 'Filter by Priority',
    allPriorities: 'All Priorities',
    sortTickets: 'Sort Tickets',
    sortByLabel: 'Sort by',
    sortPlaceholder: 'Sort tickets',
    lastUpdatedSort: 'Last Updated (Newest First)',
    priorityHighLowSort: 'Priority (High to Low)',
    priorityLowHighSort: 'Priority (Low to High)',
    creationDateSort: 'Creation Date (Newest First)',
    workerStats: {
      openTickets: 'Open Tickets',
      openTicketsDesc: 'Currently assigned to you',
      inProgressTickets: 'In Progress Tickets',
      inProgressTicketsDesc: 'Currently being worked on',
    },
     userStats: {
      openTickets: 'Your Open Tickets',
      openTicketsDesc: 'Awaiting agent response',
      inProgressTickets: 'Your In-Progress Tickets',
      inProgressTicketsDesc: 'Being actively worked on',
      resolvedTickets: 'Your Resolved Tickets',
      resolvedTicketsDesc: 'Awaiting your confirmation',
    }
  },
  dashboardLayout: {
    footer: 'FireDesk © {year}',
  },
} as const;
