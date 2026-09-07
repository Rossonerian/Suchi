import { ClerkProvider, useAuth, useOrganization, useOrganizationList } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { tokenCache } from '../src/auth';
import { notificationDestination } from '../src/notification-links';
import '../global.css';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function NotificationResponseHandler() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const { isSignedIn } = useAuth();
  const { organization } = useOrganization();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { pageSize: 20 } });
  const handled = useRef<string | null>(null);
  const pending = useRef<{ destination: string; organizationId: string; identifier: string } | null>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target || target.organizationId !== organization?.id) return;
    pending.current = null;
    router.push(target.destination);
  }, [organization?.id, router]);

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
      if (organizationId && organizationId !== organization?.id) {
        const belongsToWorkspace = userMemberships?.data?.some((membership) => membership.organization.id === organizationId);
        if (!belongsToWorkspace) return;
        pending.current = { destination: target, organizationId, identifier: notificationIdentifier };
        await setActive?.({ organization: organizationId });
        return;
      }
      pending.current = null;
      router.push(target);
    }
    openDestination().catch(() => undefined);
  }, [isLoaded, isSignedIn, organization?.id, response, router, setActive, userMemberships?.data]);

  return null;
}

export default function RootLayout() {
  if (!publishableKey) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-foreground">Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to sign in.</Text></View>;
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><QueryClientProvider client={queryClient}><NotificationResponseHandler /><Stack screenOptions={{ headerShown: false }} /></QueryClientProvider></ClerkProvider>;
}
