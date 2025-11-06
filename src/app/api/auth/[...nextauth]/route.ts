import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from '@supabase/supabase-js'

// Cliente admin de Supabase
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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user }) {
      try {
        const supabase = getSupabaseAdmin()

        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('google_id')
          .eq('google_id', user.id)
          .maybeSingle()

        if (!existingUser) {
          // Crear usuario
          await supabase
            .from('users')
            .insert({
              google_id: user.id,
              email: user.email,
              name: user.name
            })

          // Crear perfil
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.name || '',
              avatar_url: user.image || null,
              currency: 'EUR',
            })
        }

        return true
      } catch (error) {
        console.error('Error en signIn:', error)
        return true // Permitir login aunque falle
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
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
