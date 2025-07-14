// Placeholder offline storage service
export const offlineStorage = {
  getCacheStats: async () => {
    return { itemsCount: 0, totalSize: 0 };
  },
  getCachedItems: async () => {
    return [];
  },
  getCachedProfile: async () => {
    return null;
  },
  getAppSettings: async () => {
    return {};
  },
}; 