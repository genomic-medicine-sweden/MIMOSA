'use client';
import dynamic from 'next/dynamic';

const AppWrapper = dynamic(() => import('@/components/AppWrapper'), { ssr: false });

export default function Page() {
  return <AppWrapper />;
}

