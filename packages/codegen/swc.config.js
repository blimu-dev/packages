module.exports = {
  jsc: {
    target: 'es2024',
    parser: {
      syntax: 'typescript',
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
  module: {
    type: 'commonjs',
  },
  sourceMaps: true,
};
