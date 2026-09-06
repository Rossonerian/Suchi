import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { mobileApi, Project, Task } from '../src/api';

export default function TasksScreen() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const tasks = useQuery({ queryKey: ['mobile-tasks'], queryFn: async () => mobileApi.tasks((await getToken()) || '') });
  const projects = useQuery({ queryKey: ['mobile-projects'], queryFn: async () => mobileApi.projects((await getToken()) || '') });
  const create = useMutation({ mutationFn: async () => { const project = projects.data?.projects[0]; if (!project) throw new Error('Create a project on the web before adding a task.'); return mobileApi.createTask((await getToken()) || '', { projectId: project.id, title: title.trim() }); }, onSuccess: () => { setTitle(''); queryClient.invalidateQueries({ queryKey: ['mobile-tasks'] }); } });
  const update = useMutation({ mutationFn: async ({ task, status }: { task: Task; status: string }) => mobileApi.updateTask((await getToken()) || '', task.id, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-tasks'] }) });
  if (tasks.isPending || projects.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (tasks.isError || projects.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="text-center text-red-700">{(tasks.error || projects.error)?.message}</Text></View>;
  const project = projects.data.projects[0] as Project | undefined;
  return <View className="flex-1 bg-background px-4 pt-14"><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="mb-4 text-2xl font-bold text-foreground">My Work</Text><View className="mb-5 rounded-lg border border-border bg-white p-3"><Text className="mb-2 font-semibold text-foreground">Add a task{project ? ` to ${project.name}` : ''}</Text><TextInput accessibilityLabel="Task title" className="min-h-11 rounded-md border border-border px-3 text-foreground" value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor="#526270" /><Pressable accessibilityRole="button" accessibilityLabel="Create task" className="mt-3 min-h-11 items-center justify-center rounded-md bg-primary" onPress={() => create.mutate()} disabled={create.isPending || !title.trim() || !project}>{create.isPending ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Create task</Text>}</Pressable>{create.isError ? <Text accessibilityRole="alert" className="mt-2 text-red-700">{create.error.message}</Text> : null}</View><FlatList data={tasks.data.tasks} keyExtractor={(item) => item.id} ListEmptyComponent={<Text className="text-muted">No tasks yet.</Text>} renderItem={({ item }: { item: Task }) => <View className="mb-3 rounded-lg border border-border bg-white p-4"><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.status} · {item.priority}{item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleDateString()}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.title} ${item.status === 'done' ? 'to do' : 'done'}`} className="mt-3 self-start rounded-md border border-border px-3 py-2" onPress={() => update.mutate({ task: item, status: item.status === 'done' ? 'todo' : 'done' })} disabled={update.isPending}><Text className="text-foreground">{item.status === 'done' ? 'Reopen' : 'Mark done'}</Text></Pressable></View>} /></View>;
}
