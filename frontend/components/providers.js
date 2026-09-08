import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BetterAuthProvider } from '../lib/better-auth-client';

export default function Providers({ children }) {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
  return <BetterAuthProvider>{content}</BetterAuthProvider>;
}
