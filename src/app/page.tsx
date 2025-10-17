'use client';

import dynamic from 'next/dynamic';

const ControlFinanciero = dynamic(() => import('../../components/ControlFinanciero'), { ssr: false });

export default function Home() {
  return <ControlFinanciero />;
}
