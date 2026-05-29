export const NOTIFICATION_UNREAD_CHANGED_EVENT = 'codecoachai:notification-unread-changed'

export const notifyUnreadChanged = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UNREAD_CHANGED_EVENT))
}
