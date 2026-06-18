import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'SeismoSense — Real-Time Seismic Monitoring',
  description: 'AI-powered seismic monitoring platform with real-time waveform analysis and earthquake detection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
