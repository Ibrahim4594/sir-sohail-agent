if (typeof Promise.try !== 'function') {
  Promise.try = function promiseTry(fn, ...args) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (error) {
        reject(error);
      }
    });
  };
}
