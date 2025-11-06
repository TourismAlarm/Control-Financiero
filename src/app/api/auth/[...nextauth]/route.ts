import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from '@supabase/supabase-js'

// Cliente admin de Supabase para operaciones del servidor
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

        // Verificar si el usuario ya existe
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('google_id')
          .eq('google_id', user.id)
          .maybeSingle()

        if (selectError) {
          console.error('❌ Error verificando usuario:', selectError)
          return true
        }

        if (!existingUser) {
          console.log('🆕 Creando nuevo usuario...')

          // Crear usuario en la tabla users
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
            return false
          }

          console.log('✅ Usuario creado:', newUser)

          // Crear perfil automáticamente
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
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
          } else {
            console.log('✅ Perfil creado:', newProfile)
          }
        } else {
          console.log('✅ Usuario ya existe, Google ID:', existingUser.google_id)
        }

        return true
      } catch (error) {
        console.error('❌ Error en signIn callback:', error)
        return true
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
})

export { handler as GET, handler as POST }
