import { ClerkProvider } from '@clerk/expo';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { tokenCache } from '../src/auth';
import '../global.css';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export default function RootLayout() {
  if (!publishableKey) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-foreground">Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to sign in.</Text></View>;
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><QueryClientProvider client={queryClient}><Stack screenOptions={{ headerShown: false }} /></QueryClientProvider></ClerkProvider>;
}
