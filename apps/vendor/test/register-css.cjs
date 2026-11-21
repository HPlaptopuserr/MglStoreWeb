// Node tests render React markup without a bundler. Keep CSS imports test-only.
require.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_target, key) => key === "__esModule" ? false : String(key) });
};
