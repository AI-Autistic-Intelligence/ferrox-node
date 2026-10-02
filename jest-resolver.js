const fs = require('fs');

module.exports = (path, options) => {
  const resolver = options.defaultResolver;
  if (path.endsWith('.js')) {
    try {
      return resolver(path.replace(/\.js$/, '.ts'), options);
    } catch (e) {
      // Fallback
    }
  }
  return resolver(path, options);
};
