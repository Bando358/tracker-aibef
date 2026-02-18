import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Identifiants requis");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { antenne: true },
        });

        if (!user || !user.isActive) {
          throw new Error("Compte introuvable ou desactive");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Mot de passe incorrect");
        }

        return {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          username: user.username,
          role: user.role,
          antenneId: user.antenneId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nom = user.nom;
        token.prenom = user.prenom;
        token.role = user.role;
        token.antenneId = user.antenneId;

        if (user.antenneId) {
          const antenne = await prisma.antenne.findUnique({
            where: { id: user.antenneId },
            select: { nom: true },
          });
          token.antenneName = antenne?.nom ?? null;
        } else {
          token.antenneName = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        nom: token.nom,
        prenom: token.prenom,
        email: token.email ?? "",
        username: token.sub ?? "",
        role: token.role,
        antenneId: token.antenneId,
        antenneName: token.antenneName,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
