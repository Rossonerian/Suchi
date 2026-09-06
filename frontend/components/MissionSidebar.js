import TransitionLink from './TransitionLink';
import { Home, Menu, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';

function Navigation({ isAdmin, onNavigate }) {
  return <nav className="mission-nav" aria-label="Primary navigation"><TransitionLink href="/dashboard" aria-label="Dashboard" onClick={onNavigate}><Home aria-hidden="true" /><span>Dashboard</span></TransitionLink>{isAdmin && <TransitionLink href="/admin/members" aria-label="Members" onClick={onNavigate}><ShieldCheck aria-hidden="true" /><span>Members</span></TransitionLink>}</nav>;
}

export function MobileNavigationButton({ onClick }) {
  return <Button id="mobile-navigation-trigger" type="button" className="mobile-navigation-trigger" variant="outline" size="icon" aria-label="Open navigation" onClick={onClick}><Menu aria-hidden="true" /></Button>;
}

export default function MissionSidebar({ isAdmin, mobileOpen, onMobileOpenChange }) {
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !mobileOpen) {
      // The controlled Sheet has no trigger in this component, so Radix
      // cannot restore focus automatically. Return focus to the control that
      // opened navigation instead of leaving keyboard users at document.body.
      document.getElementById('mobile-navigation-trigger')?.focus();
    }
    wasOpen.current = Boolean(mobileOpen);
  }, [mobileOpen]);

  return <>
    <aside className="mission-sidebar"><div className="mission-sidebar-brand"><span className="eyebrow">NIDAR 2026–27</span><strong>Mission control</strong></div><Navigation isAdmin={isAdmin} /></aside>
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}><SheetContent side="left" className="mission-mobile-sheet"><SheetHeader><SheetTitle>Mission control</SheetTitle><SheetDescription>NIDAR AirMouse operations</SheetDescription></SheetHeader><Navigation isAdmin={isAdmin} onNavigate={() => onMobileOpenChange(false)} /></SheetContent></Sheet>
  </>;
}
