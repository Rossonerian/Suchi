import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ClerkProvider } from '@clerk/nextjs';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(clerkPublishableKey);

export default function Providers({ children }) {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
  return clerkEnabled ? <ClerkProvider publishableKey={clerkPublishableKey}>{content}</ClerkProvider> : content;
}
