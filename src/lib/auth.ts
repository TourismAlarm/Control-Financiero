import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Crea el perfil la primera vez que entras (un trigger en la BD crea las
    // categorías por defecto). Si ya existe no lo toca.
    async signIn({ user, account }) {
      const id = account?.providerAccountId || user?.id
      if (!id || !user?.email) return true
      try {
        const { error } = await supabaseAdmin
          .from("profiles")
          .upsert(
            { id, email: user.email, full_name: user.name ?? null, avatar_url: user.image ?? null },
            { onConflict: "id", ignoreDuplicates: true }
          )
        if (error) console.error("❌ No se pudo crear el perfil:", error.message)
      } catch (err) {
        console.error("❌ No se pudo crear el perfil:", err)
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub as string
      }
      return session
    },
  },
}
