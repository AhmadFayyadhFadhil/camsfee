/**
 * OfflineQueueUtil.js
 * Utilitas manajemen antrean penyimpanan lokal (localStorage/IndexedDB)
 * untuk mendukung operasional CS saat berada di blank-spot sinyal.
 */

const QUEUE_KEY = 'cams_offline_queue';

export const OfflineQueueUtil = {
  getQueue() {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading offline queue:', e);
      return [];
    }
  },

  enqueue(item) {
    try {
      const queue = this.getQueue();
      const newItem = {
        id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        ...item,
      };
      queue.push(newItem);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return newItem;
    } catch (e) {
      console.error('Error saving to offline queue:', e);
      return null;
    }
  },

  remove(id) {
    try {
      const queue = this.getQueue().filter((item) => item.id !== id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (e) {
      console.error('Error removing item from offline queue:', e);
      return false;
    }
  },

  clear() {
    try {
      localStorage.removeItem(QUEUE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  count() {
    return this.getQueue().length;
  },
};

export default OfflineQueueUtil;
