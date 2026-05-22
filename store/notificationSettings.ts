import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationSoundMode = 'none' | 'repeat' | 'until_click'

interface NotificationSettingsStore {
  // Order alert settings
  orderSoundMode: NotificationSoundMode
  orderRepeatCount: number
  orderFlashEnabled: boolean
  setOrderSoundMode: (mode: NotificationSoundMode) => void
  setOrderRepeatCount: (count: number) => void
  setOrderFlashEnabled: (enabled: boolean) => void

  // Reservation alert settings
  reservationSoundMode: NotificationSoundMode
  reservationRepeatCount: number
  reservationFlashEnabled: boolean
  setReservationSoundMode: (mode: NotificationSoundMode) => void
  setReservationRepeatCount: (count: number) => void
  setReservationFlashEnabled: (enabled: boolean) => void
}

export const useNotificationSettings = create<NotificationSettingsStore>()(
  persist(
    (set) => ({
      orderSoundMode: 'repeat',
      orderRepeatCount: 3,
      orderFlashEnabled: false,
      setOrderSoundMode: (orderSoundMode) => set({ orderSoundMode }),
      setOrderRepeatCount: (orderRepeatCount) => set({ orderRepeatCount }),
      setOrderFlashEnabled: (orderFlashEnabled) => set({ orderFlashEnabled }),

      reservationSoundMode: 'repeat',
      reservationRepeatCount: 3,
      reservationFlashEnabled: false,
      setReservationSoundMode: (reservationSoundMode) => set({ reservationSoundMode }),
      setReservationRepeatCount: (reservationRepeatCount) => set({ reservationRepeatCount }),
      setReservationFlashEnabled: (reservationFlashEnabled) => set({ reservationFlashEnabled }),
    }),
    { name: 'orderflow-notification-settings' }
  )
)
