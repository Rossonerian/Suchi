import { useAuth } from '@clerk/expo';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { mobileApi, Meeting } from '../src/api';

export default function MeetingsScreen() {
  const { getToken } = useAuth();
  const query = useQuery({ queryKey: ['mobile-meetings'], queryFn: async () => mobileApi.meetings((await getToken()) || '') });
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-red-700">{query.error.message}</Text></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="mb-4 text-2xl font-bold text-foreground">Meetings</Text><FlatList data={query.data.meetings} keyExtractor={(item) => item.id} ListEmptyComponent={<Text className="text-muted">No meetings scheduled.</Text>} renderItem={({ item }: { item: Meeting }) => <View className="mb-3 rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{new Date(item.startAt).toLocaleString()} · {item.status || 'scheduled'}</Text></View>} /></View>;
}
