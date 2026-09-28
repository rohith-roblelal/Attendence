import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';
import { ThemeProvider } from "../components/ThemeProvider";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://attendance.yourdomain.com'),
  title: {
    default: 'College Attendance System',
    template: '%s | College Attendance System',
  },
  description: 'Role-based college attendance and management system for administrators, HODs, teachers, and students. Track and manage attendance securely and efficiently.',
  keywords: ['college', 'attendance', 'education', 'management', 'university', 'student tracking'],
  authors: [{ name: 'Rohith Roblelal' }],
  openGraph: {
    title: 'College Attendance System',
    description: 'Role-based college attendance and management system for administrators, HODs, teachers, and students.',
    type: 'website',
    locale: 'en_US',
    siteName: 'College Attendance System',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
