const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to disable lintVitalAnalyzeRelease tasks and configure lint
 * This prevents OutOfMemoryError: Metaspace during build
 */
const withDisableLint = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Check if code already exists
    if (buildGradle.includes('lintVitalAnalyzeRelease') || buildGradle.includes('lint { disable')) {
      return config;
    }

    // Add lint configuration to android block
    let modifiedGradle = buildGradle;
    
    // Find android block and add lint configuration
    if (modifiedGradle.includes('android {')) {
      // Add lint block inside android block - use simple string replacement
      if (!modifiedGradle.includes('lint {')) {
        const lintConfig = `
    lint {
        checkReleaseBuilds false
        abortOnError false
        disable 'BlockedPrivateApi', 'DiscouragedPrivateApi', 'PrivateApi', 'SoonBlockedPrivateApi'
    }`;
        // Insert after first occurrence of "android {"
        const androidIndex = modifiedGradle.indexOf('android {');
        if (androidIndex !== -1) {
          const insertIndex = androidIndex + 'android {'.length;
          modifiedGradle = modifiedGradle.slice(0, insertIndex) + lintConfig + modifiedGradle.slice(insertIndex);
        }
      }
    }

    // Add code to disable lintVital tasks at the end
    const disableLintCode = `
// Disable lintVitalAnalyzeRelease tasks to prevent OutOfMemoryError: Metaspace
afterEvaluate {
    tasks.matching { it.name.contains("lintVitalAnalyzeRelease") }.configureEach {
        enabled = false
    }
    tasks.matching { it.name.contains("lintVitalAnalyze") }.configureEach {
        enabled = false
    }
    tasks.matching { it.name.contains("lintVital") }.configureEach {
        enabled = false
    }
    tasks.matching { it.name.contains("lint") && it.name.contains("Release") }.configureEach {
        enabled = false
    }
}
`;

    config.modResults.contents = modifiedGradle + '\n' + disableLintCode;
    return config;
  });
};

module.exports = withDisableLint;

