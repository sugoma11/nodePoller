// Handler registry for different request types
const handlers = new Map();

function register(type, handler) {
  if (typeof handler !== 'function') {
    throw new Error(`Handler for type "${type}" must be a function`);
  }
  handlers.set(type, handler);
}

function get(type) {
  return handlers.get(type);
}

function has(type) {
  return handlers.has(type);
}

function list() {
  return Array.from(handlers.keys());
}

module.exports = {
  register,
  get,
  has,
  list
};