/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@features/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@features/shops/context/ShopContext', () => ({
  ShopProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@shared/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/navigation/RootNavigator', () => () => null);

import App from '../App';

test('renders correctly', async () => {
  jest.useFakeTimers();

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
    jest.runAllTimers();
  });

  jest.useRealTimers();
});
