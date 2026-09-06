import { ClerkProvider } from '@clerk/expo';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tokenCache } from '../src/auth';
import '../global.css';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export default function RootLayout() {
  if (!publishableKey) return <Stack />;
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><QueryClientProvider client={queryClient}><Stack screenOptions={{ headerShown: false }} /></QueryClientProvider></ClerkProvider>;
}
