import GoogleProvider from "next-auth/providers/google"
import { createBrowserClient } from '@supabase/ssr'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Crear cliente de Supabase
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        console.log('🔵 NextAuth signIn callback - User ID:', user.id)

        // Verificar si el usuario ya existe
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('id')
          .eq('google_id', user.id)
          .maybeSingle()

        if (selectError) {
          console.error('❌ Error verificando usuario:', selectError)
          return true // Permitir login aunque falle la verificación
        }

        if (!existingUser) {
          // Crear el usuario si no existe
          console.log('🔵 Creando nuevo usuario en Supabase...')
          const { data, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                google_id: user.id,
                email: user.email,
                name: user.name
              }
            ])
            .select()
            .single()

          if (insertError) {
            console.error('❌ Error creando usuario:', insertError)
          } else {
            console.log('✅ Usuario creado exitosamente:', data)
          }
        } else {
          console.log('✅ Usuario ya existe en Supabase')
        }

        return true
      } catch (error) {
        console.error('❌ Error en signIn callback:', error)
        return true // Permitir login aunque falle
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
}
