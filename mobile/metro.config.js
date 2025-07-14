const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Expo SDK 53 + Supabase compatibility issue
// Disable the new package exports resolver that causes WebSocket import issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 