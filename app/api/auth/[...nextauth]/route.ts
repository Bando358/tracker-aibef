import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Sur Vercel, auto-detecter NEXTAUTH_URL si non defini ou en http
if (process.env.VERCEL === "1" && !process.env.NEXTAUTH_URL?.startsWith("https://")) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
