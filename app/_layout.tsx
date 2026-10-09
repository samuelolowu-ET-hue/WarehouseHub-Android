import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../src/providers/AuthProvider';
import { CatalogueProvider } from '../src/providers/CatalogueProvider';
import { CartProvider } from '../src/providers/CartProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CatalogueProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </CartProvider>
      </CatalogueProvider>
    </AuthProvider>
  );
}