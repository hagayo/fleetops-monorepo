import type { Metadata } from 'next';

import ThemeRegistry from '../theme/ThemeRegistry';

export const metadata: Metadata = {
  title: 'FleetOps Dashboard',
  description: 'Hospital robot fleet simulation dashboard',
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{props.children}</ThemeRegistry>
      </body>
    </html>
  );
}
