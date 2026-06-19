import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bell, CheckCheck, X } from 'lucide-react-native';
import { AppNotification } from '../types/app';

interface NotificationsModalProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsModal({
  isOpen,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationsModalProps) {
  const unreadCount = notifications.filter(item => item.status === 'unread').length;

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Bell size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
            onPress={onClose}
            style={styles.iconButton}>
            <X size={20} color="#334155" />
          </Pressable>
        </View>

        {notifications.length > 0 ? (
          <>
            <View style={styles.actionBar}>
              <Pressable
                accessibilityRole="button"
                onPress={onMarkAllRead}
                style={styles.markAllButton}>
                <CheckCheck size={16} color="#2563EB" />
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {notifications.map(notification => (
                <Pressable
                  key={notification.id}
                  accessibilityRole="button"
                  onPress={() => onMarkRead(notification.id)}
                  style={[
                    styles.notificationCard,
                    notification.status === 'unread' && styles.unreadCard,
                  ]}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{notification.title}</Text>
                    {notification.status === 'unread' ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.cardBody}>{notification.body}</Text>
                  <Text style={styles.cardMeta}>
                    {formatNotificationTime(notification.createdAt)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Bell size={30} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              Payment updates, teacher notes, and account alerts will appear here.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  markAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  markAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: 12,
    padding: 18,
    paddingTop: 10,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  unreadCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  unreadDot: {
    backgroundColor: '#2563EB',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  cardBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  cardMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
});
