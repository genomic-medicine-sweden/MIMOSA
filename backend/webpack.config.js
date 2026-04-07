const path = require('path');

module.exports = (options) => ({
  ...options,
  watchOptions: {
    ignored: /^(?!.*\/(backend|shared)\/).*/,
  },
});
