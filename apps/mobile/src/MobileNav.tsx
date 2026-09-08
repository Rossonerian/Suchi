import { Link, usePathname, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { Pressable, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { banani } from './banani';

const items = [
  { href: '/tasks', label: 'My Work', icon: '✓' },
  { href: '/notifications', label: 'Inbox', icon: '◌' },
  { href: '/projects', label: 'Projects', icon: '▦' },
  { href: '/meetings', label: 'Calendar', icon: '□' },
];

type MobileNavProps = { hidden?: boolean; onReveal?: () => void };

export function useNavVisibility() {
  const [hidden, setHidden] = useState(false);
  const lastOffset = useRef(0);
  const onScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = offset - lastOffset.current;
    if (offset < 12 || delta < -10) setHidden(false);
    else if (delta > 12) setHidden(true);
    lastOffset.current = offset;
  };
  return { hidden, onScroll, reveal: () => setHidden(false) };
}

/** Floating navigation shared by native work surfaces. `hidden` is controlled
 * by a scrolling screen so the nav can hide without removing its semantics. */
export function MobileNav({ hidden = false, onReveal }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const navStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(hidden ? 120 : 0, { duration: reducedMotion ? 0 : 220, easing: Easing.out(Easing.cubic) }) }],
  }), [hidden, reducedMotion]);

  if (hidden) {
    return <>
      <Pressable accessibilityRole="button" accessibilityLabel="Create task" style={({ pressed }) => [styles.create, styles.hiddenCreate, { bottom: Math.max(insets.bottom, 8) + 8 }, pressed && styles.createPressed]} onPress={() => router.push('/tasks')}><Text style={styles.createText}>+</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Show navigation" onPress={onReveal} style={[styles.reveal, { bottom: Math.max(insets.bottom, 8) + 8 }]}><Text style={styles.revealText}>⌃</Text></Pressable>
    </>;
  }

  return <Animated.View style={[styles.shell, { bottom: Math.max(insets.bottom, 8) }, navStyle]}><View style={styles.inner}>{items.map((item) => { const selected = pathname === item.href || (item.href === '/tasks' && pathname?.startsWith('/tasks/')); return <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && styles.itemPressed]}><Text style={[styles.icon, selected && styles.iconSelected]}>{item.icon}</Text><Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text></Pressable></Link>; })}<Pressable accessibilityRole="button" accessibilityLabel="Create task" style={({ pressed }) => [styles.create, pressed && styles.createPressed]} onPress={() => router.push('/tasks')}><Text style={styles.createText}>+</Text></Pressable></View></Animated.View>;
}

const styles = {
  shell: { position: 'absolute' as const, left: 12, right: 12, zIndex: 20, borderRadius: 28, borderWidth: 1, borderColor: banani.borderStrong, backgroundColor: 'rgba(23,26,33,0.94)', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 10 },
  inner: { minHeight: 68, flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 7, paddingVertical: 7, gap: 3 },
  item: { minHeight: 54, flex: 1, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 2 },
  itemSelected: { backgroundColor: banani.accentSoft },
  itemPressed: { opacity: 0.72 },
  icon: { color: banani.textMuted, fontSize: 17, lineHeight: 20 },
  iconSelected: { color: banani.accentHover },
  label: { color: banani.textMuted, fontSize: 10, fontWeight: '600' as const, marginTop: 3 },
  labelSelected: { color: banani.accentHover },
  create: { width: 52, height: 52, borderRadius: 26, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: banani.accent, marginLeft: 3, shadowColor: banani.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  hiddenCreate: { position: 'absolute' as const, right: 22, zIndex: 22, marginLeft: 0 },
  createPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  createText: { color: banani.canvas, fontSize: 28, fontWeight: '300' as const, lineHeight: 30 },
  reveal: { position: 'absolute' as const, alignSelf: 'center' as const, zIndex: 21, width: 44, height: 24, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(23,26,33,0.96)', borderWidth: 1, borderColor: banani.borderStrong },
  revealText: { color: banani.accentHover, fontSize: 15, fontWeight: '800' as const },
};
