module.exports = function disableDevMenu(config) {
  config.plugins = config.plugins || [];
  config.plugins.push([
    "expo-dev-menu",
    {
      enableDevMenu: false
    }
  ]);
  return config;
};
