import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { mobileApi } from '../src/api';
import { MobileNav } from '../src/MobileNav';

type Proposal = { confirmationToken: string; arguments: Record<string, unknown> };
function proposalEntries(proposal: Proposal) { return Object.entries(proposal.arguments || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''); }

export default function AiScreen() {
  const { getToken } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!question.trim() || busy) return;
    setBusy(true); setError('');
    try { const result = await mobileApi.askAi((await getToken()) || '', question.trim()); setAnswer(result.answer); setProposal(result.proposals[0] || null); setQuestion(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'The assistant is unavailable.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!proposal) return;
    setBusy(true); setError('');
    try { const result = await mobileApi.confirmAiWrite((await getToken()) || '', proposal.confirmationToken); setAnswer(`Created ${result.task.title}.`); setProposal(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to confirm the change.'); }
    finally { setBusy(false); }
  }
  return <View className="flex-1 bg-background"><ScrollView className="px-5 pt-14" contentContainerStyle={{ paddingBottom: 96 }}><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="text-2xl font-bold text-foreground">AI assistant</Text><Text className="mt-2 text-muted">Ask about authorized workspace data. Writes require confirmation.</Text>{answer ? <View accessibilityLiveRegion="polite" className="mt-6 rounded-lg border border-border bg-background p-4"><Text className="text-sm text-muted">Assistant</Text><Text className="mt-2 text-foreground">{answer}</Text></View> : null}{proposal ? <View className="mt-4 rounded-lg border border-primary bg-background p-4"><Text className="font-semibold text-foreground">Proposed change</Text><Text className="mt-1 text-sm text-muted">Review every field before confirming.</Text><View className="mt-3 gap-2">{proposalEntries(proposal).map(([key, value]) => <View key={key} className="rounded-md border border-border p-2"><Text className="text-xs text-muted">{key}</Text><Text className="mt-1 text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text></View>)}</View><View className="mt-3 flex-row gap-2"><Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-md bg-primary" onPress={() => Alert.alert('Confirm change', 'Create this change in the active organization?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: confirm }])} disabled={busy}><Text className="font-semibold text-white">Confirm</Text></Pressable><Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-md border border-border" onPress={() => setProposal(null)} disabled={busy}><Text className="font-semibold text-foreground">Discard</Text></Pressable></View></View> : null}<TextInput accessibilityLabel="Question" className="mt-6 min-h-28 rounded-lg border border-border bg-background p-4 text-foreground" multiline value={question} onChangeText={setQuestion} placeholder="What tasks are overdue?" placeholderTextColor="#526270" /><Pressable accessibilityRole="button" accessibilityLabel="Ask assistant" className="mt-3 min-h-12 items-center justify-center rounded-lg bg-primary" onPress={ask} disabled={busy || !question.trim()}>{busy ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Ask assistant</Text>}</Pressable>{error ? <Text accessibilityRole="alert" className="mt-3 text-red-700">{error}</Text> : null}</ScrollView><MobileNav /></View>;
}
