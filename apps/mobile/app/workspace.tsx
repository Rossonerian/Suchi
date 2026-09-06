import { useAuth, useOrganizationList } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function WorkspaceScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { pageSize: 20 } });
  useEffect(() => { const first = userMemberships?.data?.[0]?.organization?.id; if (first) setActive?.({ organization: first }); }, [setActive, userMemberships?.data]);
  useEffect(() => { if (!isSignedIn) router.replace('/'); }, [isSignedIn, router]);
  if (!isSignedIn) return null;
  if (!isLoaded) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (!userMemberships?.data?.length) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-2 text-xl font-semibold text-foreground">Create a workspace on the web</Text><Text className="mb-6 text-center text-muted">Mobile will show organizations after you create or join one.</Text><Pressable accessibilityRole="button" onPress={() => signOut()} className="rounded-lg border border-border px-4 py-3"><Text className="text-foreground">Sign out</Text></Pressable></View>;
  return <View className="flex-1 bg-background px-5 pt-16"><Text className="text-3xl font-bold text-foreground">Your workspace</Text><Text className="mt-2 text-muted">{userMemberships.data[0].organization.name}</Text><View className="mt-8 gap-3"><Link href="/tasks" asChild><Pressable className="rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">My Work and tasks</Text></Pressable></Link><Link href="/meetings" asChild><Pressable className="rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">Meetings</Text></Pressable></Link><Link href="/notifications" asChild><Pressable className="rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">Notifications</Text></Pressable></Link><Link href="/ai" asChild><Pressable className="rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">AI assistant</Text></Pressable></Link></View><Pressable accessibilityRole="button" onPress={() => signOut()} className="mt-8 self-start rounded-lg border border-border px-4 py-3"><Text className="text-foreground">Sign out</Text></Pressable></View>;
}
