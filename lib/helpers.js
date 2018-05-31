'use babel'

export function autobind(self, ...methods) {
  for (const method of methods) {
    if (typeof self[method] === 'function') {
      self[method] = self[method].bind(self)
    } else {
      throw new Error(`dev error: method: '${method}' does not exist on ${self.constructor.name}`)
    }
  }
}


