import { useWorkspace } from '../src/workspace';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { mobileApi } from '../src/api';
import { MobileNav } from '../src/MobileNav';
import { notificationDestination } from '../src/notification-links';

export default function NotificationsScreen() {
  const { activeWorkspace, getAuthCookie } = useWorkspace();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobile-notifications', activeWorkspace?.id], enabled: Boolean(activeWorkspace?.id), queryFn: async () => mobileApi.notifications(await getAuthCookie()) });
  const read = useMutation({ mutationFn: async (id: string) => mobileApi.markNotificationRead(await getAuthCookie(), id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications', activeWorkspace?.id] }) });
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-4 text-center text-red-700">{query.error.message}</Text><Pressable accessibilityRole="button" className="rounded-md border border-border px-4 py-3" onPress={() => query.refetch()}><Text className="text-foreground">Try again</Text></Pressable></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><View className="mb-4 flex-row items-center justify-between"><View><Text className="text-2xl font-bold text-foreground">Inbox</Text><Text className="mt-1 text-muted">Updates that need your attention.</Text></View><Link href="/workspace" className="text-primary">Workspace</Link></View><FlatList contentContainerStyle={{ paddingBottom: 88 }} data={query.data.notifications} keyExtractor={(item) => item.id} ListEmptyComponent={<View className="rounded-lg border border-dashed border-border p-5"><Text className="font-semibold text-foreground">You’re all caught up</Text><Text className="mt-1 text-muted">New assignments and meeting updates will appear here.</Text></View>} renderItem={({ item }) => { const destination = notificationDestination(item); return <View className={`mb-3 rounded-lg border border-border p-4 ${item.readAt ? '' : 'bg-primary/5'}`}><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.body}</Text>{item.createdAt ? <Text className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</Text> : null}<View className="mt-3 flex-row flex-wrap gap-2">{destination ? <Link href={destination as never} asChild onPress={() => { if (!item.readAt) read.mutate(item.id); }}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} className="rounded-md border border-border px-3 py-2"><Text className="text-foreground">Open related work</Text></Pressable></Link> : null}{!item.readAt ? <Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.title} read`} className="rounded-md border border-border px-3 py-2" onPress={() => read.mutate(item.id)}><Text className="text-foreground">Mark read</Text></Pressable> : null}</View></View>; }} /><MobileNav /></View>;
}
