import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationSoundMode = 'none' | 'repeat' | 'until_click'

interface NotificationSettingsStore {
  // Order alert settings
  orderSoundMode: NotificationSoundMode
  orderRepeatCount: number
  setOrderSoundMode: (mode: NotificationSoundMode) => void
  setOrderRepeatCount: (count: number) => void

  // Reservation alert settings
  reservationSoundMode: NotificationSoundMode
  reservationRepeatCount: number
  setReservationSoundMode: (mode: NotificationSoundMode) => void
  setReservationRepeatCount: (count: number) => void
}

export const useNotificationSettings = create<NotificationSettingsStore>()(
  persist(
    (set) => ({
      orderSoundMode: 'repeat',
      orderRepeatCount: 3,
      setOrderSoundMode: (orderSoundMode) => set({ orderSoundMode }),
      setOrderRepeatCount: (orderRepeatCount) => set({ orderRepeatCount }),

      reservationSoundMode: 'repeat',
      reservationRepeatCount: 3,
      setReservationSoundMode: (reservationSoundMode) => set({ reservationSoundMode }),
      setReservationRepeatCount: (reservationRepeatCount) => set({ reservationRepeatCount }),
    }),
    { name: 'orderflow-notification-settings' }
  )
)
