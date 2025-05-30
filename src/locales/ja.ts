
export default {
  header: {
    greeting: 'こんにちは',
    newTicket: '新しいチケット',
    manageUsers: 'ユーザー管理',
    adminOverview: '管理者概要',
    profile: 'プロフィール',
    signOut: 'サインアウト',
    language: '言語',
    appName: 'ファイアデスク', // Added for metadata
  },
  loginPage: {
    title: 'ファイアデスク',
    description: 'ヘルプデスクにアクセスするにはサインインしてください。',
    signInButton: 'Googleでサインイン',
    terms: 'サインインすることにより、利用規約に同意したことになります。',
    footer: '© {year} FireDesk. 全著作権所有。',
  },
  dashboardPage: {
    allTicketsManagement: '全チケット管理',
    myAssignedTickets: '担当チケット',
    mySubmittedTickets: '送信済みチケット',
    createTicketButton: '新しいチケットを作成',
    filtersAndSearch: 'フィルターと検索',
    filterDescription: 'ステータス、優先度、またはタイトル/説明でチケットをフィルターします。',
    searchPlaceholder: 'タイトルまたは説明で検索...',
    statusLabel: 'ステータス',
    statusPlaceholder: 'ステータスでフィルター',
    allStatuses: 'すべてのステータス',
    priorityLabel: '優先度',
    priorityPlaceholder: '優先度でフィルター',
    allPriorities: 'すべての優先度',
    sortTickets: 'チケットを並び替え',
    sortByLabel: '並び替え基準',
    sortPlaceholder: 'チケットを並び替え',
    lastUpdatedSort: '最終更新（新しい順）',
    priorityHighLowSort: '優先度（高から低）',
    priorityLowHighSort: '優先度（低から高）',
    creationDateSort: '作成日（新しい順）',
    workerStats: {
      openTickets: 'オープンチケット',
      openTicketsDesc: '現在あなたに割り当てられています',
      inProgressTickets: '進行中のチケット',
      inProgressTicketsDesc: '現在対応中です',
    },
    userStats: {
      openTickets: 'あなたのオープンチケット',
      openTicketsDesc: 'エージェントの返信待ち',
      inProgressTickets: 'あなたの進行中のチケット',
      inProgressTicketsDesc: '現在対応中です',
      resolvedTickets: 'あなたの解決済みチケット',
      resolvedTicketsDesc: 'あなたの確認待ちです',
    }
  },
  dashboardLayout: {
    footer: 'ファイアデスク © {year}',
  },
} as const;
