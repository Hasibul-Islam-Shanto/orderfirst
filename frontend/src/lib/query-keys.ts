export const queryKeys = {
  auth: { current: ["auth", "current"] as const },
  menu: {
    all: ["menu"] as const,
    categories: ["menu", "categories"] as const,
    list: (filters: object = {}) => ["menu", "list", filters] as const,
    detail: (id: string) => ["menu", "detail", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    mine: (filters: object = {}) => ["orders", "mine", filters] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  reservations: {
    all: ["reservations"] as const,
    mine: (filters: object = {}) => ["reservations", "mine", filters] as const,
    detail: (id: string) => ["reservations", "detail", id] as const,
    availability: (filters: object) => ["reservations", "availability", filters] as const,
  },
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    orders: (filters: object = {}) => ["admin", "orders", filters] as const,
    order: (id: string) => ["admin", "order", id] as const,
    reservations: (filters: object = {}) => ["admin", "reservations", filters] as const,
    reservation: (id: string) => ["admin", "reservation", id] as const,
    menu: (filters: object = {}) => ["admin", "menu", filters] as const,
    tables: (filters: object = {}) => ["admin", "tables", filters] as const,
  },
} as const;
