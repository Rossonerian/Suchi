import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { signInWithEmail, signInWithGoogle } from '../src/auth';
import { useWorkspace } from '../src/workspace';
import { BananiAtmosphere, BananiEyebrow, BananiMark, BananiSurface, banani, bananiStyles } from '../src/banani';

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (isLoaded && isSignedIn) router.replace('/workspace'); }, [isLoaded, isSignedIn, router]);
  if (!isLoaded || isSignedIn) return null;
  async function signIn() {
    setBusy(true); setError('');
    try {
      await signInWithGoogle();
      router.replace('/workspace');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setBusy(false); }
  }
  async function signInWithPassword() {
    if (!email.trim() || !password || busy) return;
    setBusy(true); setError('');
    try {
      const result = await signInWithEmail(email.trim(), password);
      if (result.error) throw new Error(result.error.message || 'Unable to sign in.');
      router.replace('/workspace');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setBusy(false); }
  }
  return (
    <BananiAtmosphere>
      <View style={bananiStyles.signInPage}>
        <View style={bananiStyles.signInIntro}>
          <BananiMark />
          <BananiEyebrow>Mission workspace</BananiEyebrow>
          <Text style={bananiStyles.signInTitle}>Welcome back.</Text>
          <Text style={bananiStyles.signInBody}>Keep projects, decisions, and the next important commitment in one calm workspace.</Text>
          <View style={bananiStyles.trustRow}>
            <Text style={bananiStyles.trustPill}>Private by default</Text>
            <Text style={bananiStyles.trustPill}>Team ready</Text>
          </View>
        </View>
        <BananiSurface style={bananiStyles.signInPanel}>
          <Text style={bananiStyles.panelTitle}>Sign in to your workspace</Text>
          <Text style={bananiStyles.panelSubtitle}>Use your organization account to continue.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" style={({ pressed }) => [bananiStyles.googleButton, pressed && bananiStyles.pressed]} onPress={signIn} disabled={busy}>
            {busy ? <ActivityIndicator color={banani.text} /> : <><Text style={bananiStyles.googleGlyph}>G</Text><Text style={bananiStyles.googleLabel}>Continue with Google</Text></>}
          </Pressable>
          <View style={bananiStyles.separator}><View style={bananiStyles.separatorLine} /><Text style={bananiStyles.separatorText}>or continue with email</Text><View style={bananiStyles.separatorLine} /></View>
          <Text style={bananiStyles.fieldLabel}>Email</Text>
          <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={banani.textMuted} value={email} onChangeText={setEmail} style={bananiStyles.input} />
          <Text style={bananiStyles.fieldLabel}>Password</Text>
          <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="password" secureTextEntry placeholder="Your password" placeholderTextColor={banani.textMuted} value={password} onChangeText={setPassword} style={bananiStyles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel="Sign in with email and password" style={({ pressed }) => [bananiStyles.emailButton, pressed && bananiStyles.pressed]} onPress={signInWithPassword} disabled={busy || !email.trim() || !password}>
            {busy ? <ActivityIndicator color={banani.text} /> : <Text style={bananiStyles.emailButtonLabel}>Sign in</Text>}
          </Pressable>
          <Text style={bananiStyles.helperText}>Email and password sign-in is available for invited workspace members.</Text>
          {error ? <Text accessibilityRole="alert" style={bananiStyles.error}>{error}</Text> : null}
        </BananiSurface>
      </View>
    </BananiAtmosphere>
  );
}
