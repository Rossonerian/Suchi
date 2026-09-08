import { useWorkspace } from '../src/workspace';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { mobileApi, Project } from '../src/api';
import { MobileNav, useNavVisibility } from '../src/MobileNav';

export default function ProjectsScreen() {
  const { activeWorkspace, getAuthCookie } = useWorkspace();
  const query = useQuery({ queryKey: ['mobile-projects', activeWorkspace?.id], enabled: Boolean(activeWorkspace?.id), queryFn: async () => mobileApi.projects(await getAuthCookie()) });
  const nav = useNavVisibility();
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-4 text-center text-red-700">{query.error.message}</Text><Pressable accessibilityRole="button" className="rounded-md border border-border px-4 py-3" onPress={() => query.refetch()}><Text className="text-foreground">Try again</Text></Pressable></View>;
  return <View className="flex-1 bg-background px-4 pt-14"><Text className="mb-1 text-2xl font-bold text-foreground">Projects</Text><Text className="mb-5 text-muted">The outcomes your workspace is working toward.</Text><FlatList onScroll={nav.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 104 }} data={query.data.projects} keyExtractor={(item) => item.id} ListEmptyComponent={<View className="rounded-[22px] border border-dashed border-border bg-surface p-5"><Text className="font-semibold text-foreground">No projects yet</Text><Text className="mt-1 text-muted">Create your first project on the web, then manage its work here.</Text></View>} renderItem={({ item }: { item: Project }) => <Link href={{ pathname: '/tasks', params: { projectId: item.id } }} asChild><Pressable accessibilityRole="button" accessibilityLabel={`Open project ${item.name}`} className="mb-3 rounded-[20px] border border-border bg-surface p-4"><Text className="font-semibold text-foreground">{item.name}</Text><Text className="mt-1 text-sm text-muted">{item.status || 'Active'}{item.description ? ` · ${item.description}` : ''}</Text></Pressable></Link>} /><MobileNav hidden={nav.hidden} onReveal={nav.reveal} /></View>;
}
