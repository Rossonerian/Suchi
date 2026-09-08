import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useWorkspace } from '../src/workspace';
import { notificationDestination } from '../src/notification-links';
import '../global.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function NotificationResponseHandler() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const { isLoaded, isSignedIn, activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const handled = useRef<string | null>(null);
  const pending = useRef<{ destination: string; organizationId: string } | null>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target || target.organizationId !== activeWorkspace?.id) return;
    pending.current = null;
    router.push(target.destination as never);
  }, [activeWorkspace?.id, router]);

  useEffect(() => {
    const notification = response?.notification;
    const identifier = notification?.request.identifier;
    const data = notification?.request.content.data as Record<string, unknown> | undefined;
    const destination = notificationDestination({
      organizationId: typeof data?.organizationId === 'string' ? data.organizationId : null,
      resourceType: typeof data?.resourceType === 'string' ? data.resourceType : null,
      resourceId: typeof data?.resourceId === 'string' ? data.resourceId : null,
    });
    if (!identifier || handled.current === identifier || !isSignedIn || !isLoaded || !destination) return;
    const notificationIdentifier = identifier;
    const target = destination;
    handled.current = notificationIdentifier;
    const organizationId = typeof data?.organizationId === 'string' ? data.organizationId : '';
    async function openDestination() {
      if (organizationId && organizationId !== activeWorkspace?.id) {
        if (!workspaces.some((workspace) => workspace.id === organizationId)) return;
        pending.current = { destination: target, organizationId };
        await setActiveWorkspace(organizationId);
        return;
      }
      pending.current = null;
      router.push(target as never);
    }
    openDestination().catch(() => undefined);
  }, [activeWorkspace?.id, isLoaded, isSignedIn, response, router, setActiveWorkspace, workspaces]);

  return null;
}

export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><NotificationResponseHandler /><AuthLoadingGate /></QueryClientProvider></SafeAreaProvider>;
}

function AuthLoadingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useWorkspace();
  useEffect(() => {
    if (isLoaded && !isSignedIn && pathname !== '/') router.replace('/');
  }, [isLoaded, isSignedIn, pathname, router]);
  if (isLoaded) return <Stack screenOptions={{ headerShown: false }} />;
  return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /><Text className="mt-3 text-muted">Restoring your session…</Text></View>;
}
