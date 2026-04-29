module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Desativa regras muito restritivas para React Native
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
