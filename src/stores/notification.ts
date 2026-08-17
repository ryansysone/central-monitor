import { defineStore } from "pinia";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  dedupeKey?: string;
}

interface NotificationState {
  items: NotificationItem[];
  activeKeys: string[];
}

export const useNotificationStore = defineStore("notification", {
  state: (): NotificationState => ({
    items: [],
    activeKeys: [],
  }),

  actions: {
    pushNotification(payload: Omit<NotificationItem, "id" | "createdAt" | "read">) {
      if (payload.dedupeKey && this.activeKeys.includes(payload.dedupeKey)) {
        return;
      }

      const notification: NotificationItem = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        read: false,
        ...payload,
      };

      this.items = [notification, ...this.items].slice(0, 50);

      if (payload.dedupeKey) {
        this.activeKeys.push(payload.dedupeKey);
      }
    },

    resolveNotification(dedupeKey: string) {
      this.activeKeys = this.activeKeys.filter((key) => key !== dedupeKey);
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
      const notification = this.items.find((item) => item.id === id);

      if (notification?.dedupeKey) {
        this.resolveNotification(notification.dedupeKey);
      }

      this.items = this.items.filter((item) => item.id !== id);
    },

    clearNotifications() {
      this.items = [];
      this.activeKeys = [];
    },
  },
});
