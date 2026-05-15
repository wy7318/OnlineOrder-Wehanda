import { create } from 'zustand'

export interface OrderNotification {
  id: string
  type: 'order'
  orderNumber: string
  customerName: string
  total: number
  createdAt: string
  read: boolean
}

export interface ReservationNotification {
  id: string
  type: 'reservation'
  customerName: string
  partySize: number
  reservationDate: string  // 'YYYY-MM-DD'
  reservationTime: string  // 'HH:MM'
  createdAt: string
  read: boolean
}

export type AppNotification = OrderNotification | ReservationNotification

// Explicitly typed union so callers can pass either shape and TypeScript narrows correctly
type NewNotification =
  | Omit<OrderNotification, 'read'>
  | Omit<ReservationNotification, 'read'>

interface NotificationStore {
  notifications: AppNotification[]
  add: (n: NewNotification) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  add: (n) =>
    set((state) => ({
      // Cast is safe — n satisfies one branch, spreading + read gives a valid AppNotification
      notifications: [{ ...n, read: false } as AppNotification, ...state.notifications].slice(0, 30),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  clear: () => set({ notifications: [] }),
}))
