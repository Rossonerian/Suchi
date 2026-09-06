import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { mobileApi } from '../src/api';

export default function NotificationsScreen() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobile-notifications'], queryFn: async () => mobileApi.notifications((await getToken()) || '') });
  const read = useMutation({ mutationFn: async (id: string) => mobileApi.markNotificationRead((await getToken()) || '', id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] }) });
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-red-700">{query.error.message}</Text></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="mb-4 text-2xl font-bold text-foreground">Notifications</Text><FlatList data={query.data.notifications} keyExtractor={(item) => item.id} ListEmptyComponent={<Text className="text-muted">No notifications yet.</Text>} renderItem={({ item }) => <View className="mb-3 rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.body}</Text>{!item.readAt ? <Pressable accessibilityRole="button" className="mt-3 self-start rounded-md border border-border px-3 py-2" onPress={() => read.mutate(item.id)}><Text className="text-foreground">Mark read</Text></Pressable> : null}</View>} /></View>;
}
