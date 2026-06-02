module.exports = (options) => ({
  ...options,
  watchOptions: {
    ignored: /^(?!.*\/(backend|geodata)\/).*/,
  },
});

