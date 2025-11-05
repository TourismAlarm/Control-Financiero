import GoogleProvider from "next-auth/providers/google"
import { createClient } from '@supabase/supabase-js'

// Cliente admin de Supabase para operaciones del servidor
// USA SERVICE_ROLE_KEY para bypass RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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
        const supabase = getSupabaseAdmin()

        console.log('🔵 NextAuth signIn callback - Google ID:', user.id)
        console.log('🔵 Email:', user.email)
        console.log('🔵 Name:', user.name)

        // 1. Verificar si el usuario ya existe en la tabla users
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('google_id')
          .eq('google_id', user.id)
          .maybeSingle()

        if (selectError) {
          console.error('❌ Error verificando usuario:', selectError)
          return true // Permitir login aunque falle
        }

        if (!existingUser) {
          console.log('🆕 Creando nuevo usuario...')

          // 2. Crear usuario en la tabla users
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              google_id: user.id,
              email: user.email,
              name: user.name
            })
            .select()
            .single()

          if (userError) {
            console.error('❌ Error creando usuario:', userError)
            return false // Bloquear login si falla
          }

          console.log('✅ Usuario creado:', newUser)

          // 3. Crear perfil automáticamente
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id, // Google ID
              email: user.email,
              full_name: user.name || '',
              avatar_url: user.image || null,
              currency: 'EUR',
              onboarding_completed: false
            })
            .select()
            .single()

          if (profileError) {
            console.error('❌ Error creando perfil:', profileError)
            // No bloquear login, el perfil se puede crear después
          } else {
            console.log('✅ Perfil creado:', newProfile)
          }
        } else {
          console.log('✅ Usuario ya existe, Google ID:', existingUser.google_id)
        }

        return true
      } catch (error) {
        console.error('❌ Error en signIn callback:', error)
        return true // Permitir login aunque falle
      }
    },
    async session({ session, token }) {
      // Asegurar que session.user.id sea el Google ID
      if (session?.user) {
        session.user.id = token.sub; // Google ID
      }
      return session;
    },
  },
}
