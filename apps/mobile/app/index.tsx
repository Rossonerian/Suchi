import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { signInWithGoogle } from '../src/auth';
import { useWorkspace } from '../src/workspace';

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isLoaded && isSignedIn) router.replace('/workspace'); }, [isLoaded, isSignedIn, router]);
  if (!isLoaded || isSignedIn) return null;
  async function signIn() {
    setBusy(true); setError('');
    try {
      await signInWithGoogle();
      router.replace('/workspace');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setBusy(false); }
  }
  return <View className="flex-1 items-center justify-center bg-background px-6"><Text className="mb-2 text-3xl font-bold text-foreground">NIDAR Workspace</Text><Text className="mb-8 text-center text-base text-muted">One workspace for projects, tasks, and meetings.</Text><Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" className="min-h-12 w-full max-w-sm items-center justify-center rounded-lg bg-primary px-4" onPress={signIn} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Continue with Google</Text>}</Pressable>{error ? <Text accessibilityRole="alert" className="mt-4 text-center text-red-700">{error}</Text> : null}</View>;
}
