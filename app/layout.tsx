import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: '工作室行政管理', description: '工作室與老師名單管理' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
