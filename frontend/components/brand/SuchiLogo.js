import Image from 'next/image';

export function SuchiLogo({ variant = 'horizontal', appearance = 'auto', className = '', decorative = false }) {
  const classes = ['suchi-logo', `suchi-logo-${variant}`, `suchi-logo-${appearance}`, className].filter(Boolean).join(' ');
  return <div className={classes} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Suchi'}>
    <Image src="/brand/suchi-symbol.png" width={1024} height={1024} alt="" aria-hidden="true" />
    {variant !== 'symbol' && <span aria-hidden="true">Suchi</span>}
  </div>;
}
