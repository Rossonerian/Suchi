import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

/** Shared native semantic palette for the Banani visual system. */
export const banani = {
  canvas: '#0D0E13',
  canvasElevated: '#111319',
  sidebar: '#171A21',
  surface: '#17181D',
  raised: '#1B1E27',
  input: '#101116',
  text: '#F2F3F5',
  textSecondary: '#A3A7B4',
  textMuted: '#777C89',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.14)',
  accent: '#6D8AFF',
  accentHover: '#7D98FF',
  accentSoft: 'rgba(109,138,255,0.16)',
  success: '#42D47C',
  warning: '#E2B83E',
  danger: '#FF727A',
  cyan: '#35C8D3',
} as const;

export const bananiSpacing = { page: 20, card: 16, row: 14, navBottom: 12 } as const;

export function BananiAtmosphere({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={[styles.glow, styles.glowBlue]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowCyan]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function BananiMark({ compact = false }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="Suchi" style={compact ? styles.markCompact : styles.mark}>
      <Text style={compact ? styles.markTextCompact : styles.markText}>S</Text>
    </View>
  );
}

export function BananiEyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function BananiSurface({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: banani.canvas, overflow: 'hidden' },
  content: { flex: 1 },
  glow: { position: 'absolute', borderRadius: 9999 },
  glowBlue: { width: 460, height: 460, right: -190, top: -180, backgroundColor: '#4C62DC', opacity: 0.17 },
  glowCyan: { width: 380, height: 380, left: -220, bottom: -220, backgroundColor: '#008791', opacity: 0.09 },
  mark: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: banani.accentSoft, borderWidth: 1, borderColor: 'rgba(125,152,255,0.35)' },
  markCompact: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: banani.accentSoft, borderWidth: 1, borderColor: 'rgba(125,152,255,0.35)' },
  markText: { color: banani.accentHover, fontSize: 20, fontWeight: '800' },
  markTextCompact: { color: banani.accentHover, fontSize: 15, fontWeight: '800' },
  eyebrow: { color: banani.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  surface: { backgroundColor: 'rgba(23,24,29,0.94)', borderWidth: 1, borderColor: banani.border, borderRadius: 22, padding: bananiSpacing.card },
  signInPage: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  signInIntro: { marginBottom: 24 },
  signInTitle: { color: banani.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 12 },
  signInBody: { color: banani.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 10, maxWidth: 430 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  trustPill: { color: banani.textSecondary, fontSize: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: banani.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  signInPanel: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: 'rgba(17,19,25,0.94)', borderRadius: 24, padding: 20 },
  panelTitle: { color: banani.text, fontSize: 18, fontWeight: '700' },
  panelSubtitle: { color: banani.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  googleButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: banani.borderStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  googleGlyph: { color: banani.text, fontSize: 16, fontWeight: '800' },
  googleLabel: { color: banani.text, fontSize: 14, fontWeight: '700' },
  separator: { alignItems: 'center', flexDirection: 'row', gap: 10, marginVertical: 18 },
  separatorLine: { height: 1, flex: 1, backgroundColor: banani.border },
  separatorText: { color: banani.textMuted, fontSize: 11 },
  fieldLabel: { color: banani.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: banani.borderStrong, borderRadius: 11, backgroundColor: banani.input, color: banani.text, paddingHorizontal: 13, fontSize: 15 },
  emailButton: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: banani.accent },
  emailButtonLabel: { color: '#0D0E13', fontSize: 14, fontWeight: '800' },
  helperText: { color: banani.textMuted, fontSize: 11, lineHeight: 16, marginTop: 12 },
  error: { color: banani.danger, fontSize: 13, lineHeight: 19, marginTop: 12 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});

export const bananiStyles = styles;
