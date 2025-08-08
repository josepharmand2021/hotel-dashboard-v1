export const routes = {
  dashboard: { overview: '/dashboard/overview' },

  vendors: '/vendors',
  categories: '/categories',
  subcategories: '/subcategories',
  purchaseOrders: '/purchase-orders',
  receiving: {
    grn: '/receiving/grn',
    serviceAcceptance: '/receiving/service-acceptance',
  },

  // ==== FINANCE (NEW STRUCTURE) ====
  finance: {
    reports: {
      dashboard: '/finance/reports/dashboard',      // Income / Expense / Balance
      income: '/finance/reports/income',
      expenses: '/finance/reports/expenses',        // by category/subcategory filter
    },
    expenses: '/finance/expenses',
    income: {
      root: '/finance/income',
      capitalInjections: '/finance/income/capital-injections',
      rabAllocations: '/finance/income/rab-allocations',
    },
    pettyCash: {
      dashboard: '/finance/petty-cash/dashboard',
      topups: '/finance/petty-cash/topups',
      expenses: '/finance/petty-cash/expenses',
    },
  },

  documents: { uploads: '/documents/uploads' },
  shareholders: '/shareholders',
  search: '/search',
} as const;
