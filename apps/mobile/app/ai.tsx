import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { mobileApi } from '../src/api';

export default function AiScreen() {
  const { getToken } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!question.trim() || busy) return;
    setBusy(true); setError('');
    try { const result = await mobileApi.askAi((await getToken()) || '', question.trim()); setAnswer(result.answer); setQuestion(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'The assistant is unavailable.'); }
    finally { setBusy(false); }
  }
  return <ScrollView className="flex-1 bg-background px-5 pt-14"><Link href="/workspace" className="mb-4 text-primary">← Workspace</Link><Text className="text-2xl font-bold text-foreground">AI assistant</Text><Text className="mt-2 text-muted">Ask about authorized workspace data. Writes require confirmation.</Text>{answer ? <View accessibilityLiveRegion="polite" className="mt-6 rounded-lg border border-border bg-white p-4"><Text className="text-sm text-muted">Assistant</Text><Text className="mt-2 text-foreground">{answer}</Text></View> : null}<TextInput accessibilityLabel="Question" className="mt-6 min-h-28 rounded-lg border border-border bg-white p-4 text-foreground" multiline value={question} onChangeText={setQuestion} placeholder="What tasks are overdue?" placeholderTextColor="#526270" /><Pressable accessibilityRole="button" accessibilityLabel="Ask assistant" className="mt-3 min-h-12 items-center justify-center rounded-lg bg-primary" onPress={ask} disabled={busy || !question.trim()}>{busy ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Ask assistant</Text>}</Pressable>{error ? <Text accessibilityRole="alert" className="mt-3 text-red-700">{error}</Text> : null}</ScrollView>;
}
