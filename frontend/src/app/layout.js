import './globals.css';
import 'leaflet/dist/leaflet.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'SeismoSense — SHL Station | Shillong, India',
  description: 'Single-station seismic monitoring for Shillong (SHL), Meghalaya, India — real-time waveform analysis and earthquake detection',
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
