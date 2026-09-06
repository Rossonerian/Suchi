import { useSSO, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isSignedIn) router.replace('/workspace'); }, [isSignedIn, router]);
  if (isSignedIn) return null;
  async function signIn() {
    setBusy(true); setError('');
    try {
      const result = await startSSOFlow({ strategy: 'oauth_google' });
      if (result.createdSessionId) await result.setActive?.({ session: result.createdSessionId });
      router.replace('/workspace');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setBusy(false); }
  }
  return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-2 text-3xl font-bold text-foreground">NIDAR Workspace</Text><Text className="mb-8 text-center text-base text-muted">One workspace for projects, tasks, and meetings.</Text><Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" className="min-h-12 w-full max-w-sm items-center justify-center rounded-lg bg-primary px-4" onPress={signIn} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Continue with Google</Text>}</Pressable>{error ? <Text accessibilityRole="alert" className="mt-4 text-center text-red-700">{error}</Text> : null}</View>;
}
