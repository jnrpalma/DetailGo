module.exports = {
  presets: ['@react-native/babel-preset'], // <-- RN 0.81 usa este
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
          '@assets': './assets',
        },
      },
    ],
  ],
};
