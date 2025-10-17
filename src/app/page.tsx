'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const ControlFinanciero = dynamic(() => import('../../components/ControlFinanciero'), { ssr: false });

export default function Home() {
  console.log('🔵 PAGE.TSX - Componente Home renderizado')

  const { data: session, status } = useSession();
  const router = useRouter();

  console.log('🔵 PAGE.TSX - Status:', status)
  console.log('🔵 PAGE.TSX - Session:', session)

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔴 PAGE.TSX - Usuario no autenticado, redirigiendo a signin')
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    console.log('🟡 PAGE.TSX - Mostrando pantalla de carga')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    console.log('🔴 PAGE.TSX - No hay sesión, retornando null')
    return null;
  }

  console.log('✅ PAGE.TSX - Renderizando ControlFinanciero con session')
  return <ControlFinanciero session={session} />;
}
