import { useWorkspace } from '../src/workspace';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { mobileApi, Meeting } from '../src/api';
import { MobileNav, useNavVisibility } from '../src/MobileNav';

export default function MeetingsScreen() {
  const { activeWorkspace, getAuthCookie } = useWorkspace(); const params = useLocalSearchParams<{ meetingId?: string }>();
  const meetingId = typeof params.meetingId === 'string' ? params.meetingId : '';
  const query = useQuery({ queryKey: ['mobile-meetings', activeWorkspace?.id], enabled: Boolean(activeWorkspace?.id), queryFn: async () => mobileApi.meetings(await getAuthCookie()) });
  const nav = useNavVisibility();
  if (query.isPending) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (query.isError) return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-4 text-center text-red-700">{query.error.message}</Text><Pressable accessibilityRole="button" className="rounded-md border border-border px-4 py-3" onPress={() => query.refetch()}><Text className="text-foreground">Try again</Text></Pressable></View>;
  const selectedMeeting = meetingId ? query.data.meetings.find((item) => item.id === meetingId) : undefined;
  return <View className="flex-1 bg-background px-4 pt-14"><View className="mb-4 flex-row items-center justify-between"><View><Text className="text-2xl font-bold text-foreground">Calendar</Text><Text className="mt-1 text-muted">Your upcoming meetings.</Text></View><Link href="/workspace" className="text-primary">Workspace</Link></View><FlatList onScroll={nav.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 104 }} data={query.data.meetings} keyExtractor={(item) => item.id} ListHeaderComponent={selectedMeeting ? <View accessibilityLiveRegion="polite" className="mb-4 rounded-[22px] border border-primary bg-primary/5 p-4"><Text className="text-xs font-semibold uppercase text-primary">Opened from Inbox</Text><Text className="mt-1 font-semibold text-foreground">{selectedMeeting.title}</Text><Text className="mt-1 text-sm text-muted">{new Date(selectedMeeting.startAt).toLocaleString()} · {selectedMeeting.timezone}</Text></View> : null} ListEmptyComponent={<Text className="text-muted">{meetingId ? 'This meeting is no longer available in this workspace.' : 'No meetings scheduled.'}</Text>} renderItem={({ item }: { item: Meeting }) => <View className={`mb-3 rounded-[20px] border border-border bg-surface p-4 ${item.id === meetingId ? 'border-primary' : ''}`}><Text className="font-semibold text-foreground">{item.title}</Text><Text className="mt-1 text-sm text-muted">{new Date(item.startAt).toLocaleString()} · {item.timezone} · {item.status || 'scheduled'}</Text></View>} /><MobileNav hidden={nav.hidden} onReveal={nav.reveal} /></View>;
}
