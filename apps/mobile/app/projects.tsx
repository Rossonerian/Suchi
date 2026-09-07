import { useAuth, useOrganization } from '@clerk/expo';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { mobileApi, Project } from '../src/api';
import { MobileNav } from '../src/MobileNav';

export default function ProjectsScreen() {
  const { getToken } = useAuth(); const { organization } = useOrganization();
  const query = useQuery({ queryKey: ['mobile-projects', organization?.id], enabled: Boolean(organization?.id), queryFn: async () => mobileApi.projects((await getToken()) || '') });
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-4 text-center text-red-700">{query.error.message}</Text><Pressable accessibilityRole="button" className="rounded-md border border-border px-4 py-3" onPress={() => query.refetch()}><Text className="text-foreground">Try again</Text></Pressable></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><Text className="mb-1 text-2xl font-bold text-foreground">Projects</Text><Text className="mb-5 text-muted">The outcomes your workspace is working toward.</Text><FlatList contentContainerStyle={{ paddingBottom: 88 }} data={query.data.projects} keyExtractor={(item) => item.id} ListEmptyComponent={<View className="rounded-lg border border-dashed border-border p-5"><Text className="font-semibold text-foreground">No projects yet</Text><Text className="mt-1 text-muted">Create your first project on the web, then manage its work here.</Text></View>} renderItem={({ item }: { item: Project }) => <Link href={{ pathname: '/tasks', params: { projectId: item.id } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open project ${item.name}`} className="mb-3 rounded-lg border border-border bg-background p-4"><Text className="font-semibold text-foreground">{item.name}</Text><Text className="mt-1 text-sm text-muted">{item.status || 'Active'}{item.description ? ` · ${item.description}` : ''}</Text></Pressable></Link>} /><MobileNav /></View>;
}
