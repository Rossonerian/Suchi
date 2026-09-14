import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="Suchi - Workspace platform for projects, tasks, and teams" />
        <link rel="icon" href="/icons/suchi-symbol-32.png" type="image/png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/suchi-symbol-180.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
