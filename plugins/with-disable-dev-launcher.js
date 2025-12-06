const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to disable Expo Dev Launcher in release builds
 */
const withDisableDevLauncher = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    
    if (!manifest.application) {
      return config;
    }

    const application = manifest.application[0];
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Find and update or add dev launcher meta-data
    const metaData = application['meta-data'];
    let found = false;
    
    for (let i = 0; i < metaData.length; i++) {
      if (metaData[i].$['android:name'] === 'expo.modules.devlauncher.enabled') {
        metaData[i].$['android:value'] = 'false';
        found = true;
        break;
      }
    }

    // If not found, add it
    if (!found) {
      metaData.push({
        $: {
          'android:name': 'expo.modules.devlauncher.enabled',
          'android:value': 'false'
        }
      });
    }

    return config;
  });
};

module.exports = withDisableDevLauncher;

