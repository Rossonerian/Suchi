import { Link, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const items = [
  { href: '/tasks', label: 'My Work' },
  { href: '/notifications', label: 'Inbox' },
  { href: '/projects', label: 'Projects' },
  { href: '/meetings', label: 'Calendar' },
];

export function MobileNav() {
  const pathname = usePathname();
  return <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-border bg-background px-2 pb-2 pt-2">{items.map((item) => <Link key={item.href} href={item.href} asChild><Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: pathname === item.href }} className={`min-h-12 flex-1 items-center justify-center rounded-md px-1 ${pathname === item.href ? 'bg-primary/10' : ''}`}><Text className={pathname === item.href ? 'text-xs font-semibold text-primary' : 'text-xs text-muted'}>{item.label}</Text></Pressable></Link>)}</View>;
}
