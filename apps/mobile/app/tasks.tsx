import { useAuth } from '@clerk/expo';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { mobileApi, Task } from '../src/api';

export default function TasksScreen() {
  const { getToken } = useAuth();
  const query = useQuery({ queryKey: ['mobile-tasks'], queryFn: async () => mobileApi.tasks((await getToken()) || '') });
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-red-700">{query.error.message}</Text></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="mb-4 text-2xl font-bold text-foreground">Tasks</Text><FlatList data={query.data.tasks} keyExtractor={(item) => item.id} ListEmptyComponent={<Text className="text-muted">No tasks yet.</Text>} renderItem={({ item }: { item: Task }) => <View className="mb-3 rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.status} · {item.priority}{item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleDateString()}` : ''}</Text></View>} /></View>;
}
