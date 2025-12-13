const { withGradleProperties, withAndroidManifest } = require('@expo/config-plugins');
const path = require('path');

/**
 * Config plugin to disable Expo Dev Launcher in release builds
 * This plugin:
 * 1. Disables dev launcher via AndroidManifest meta-data
 * 2. Adds Gradle property to exclude dev launcher from package list generation
 */
const withDisableDevLauncher = (config) => {
  // First, add Gradle property to exclude dev launcher
  config = withGradleProperties(config, (config) => {
    const properties = config.modResults;
    
    // Add property to exclude dev launcher from auto-generated package list
    properties.push({
      type: 'property',
      key: 'expo.modules.devlauncher.enabled',
      value: 'false'
    });
    
    return config;
  });

  // Then, disable via AndroidManifest
  config = withAndroidManifest(config, (config) => {
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

  return config;
};

module.exports = withDisableDevLauncher;