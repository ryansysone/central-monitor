import { defineStore } from "pinia";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  items: NotificationItem[];
}

export const useNotificationStore = defineStore("notification", {
  state: (): NotificationState => ({
    items: [],
  }),

  actions: {
    pushNotification(payload: Omit<NotificationItem, "id" | "createdAt" | "read">) {
      const notification: NotificationItem = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        read: false,
        ...payload,
      };

      this.items = [notification, ...this.items].slice(0, 50);
    },

    markAsRead(id: number) {
      const notification = this.items.find((item) => item.id === id);

      if (!notification) {
        return;
      }

      notification.read = true;
    },

    markAllAsRead() {
      this.items = this.items.map((item) => ({
        ...item,
        read: true,
      }));
    },

    removeNotification(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },

    clearNotifications() {
      this.items = [];
    },
  },
});
