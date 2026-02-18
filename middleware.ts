import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": [
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
    "ADMINISTRATIF",
    "SOIGNANT",
  ],
  "/antennes": ["SUPER_ADMIN"],
  "/employes": ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  "/activites": ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  "/recommandations": ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  "/pointages": [
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
    "ADMINISTRATIF",
    "SOIGNANT",
  ],
  "/conges": [
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
    "ADMINISTRATIF",
    "SOIGNANT",
  ],
  "/audit-log": ["SUPER_ADMIN"],
  "/mon-antenne": ["RESPONSABLE_ANTENNE"],
  "/mes-employes": ["RESPONSABLE_ANTENNE"],
};

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  );
}

// Detecter le bon nom de cookie selon l'environnement
const useSecureCookies = process.env.VERCEL === "1";
const cookieName = useSecureCookies
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    cookieName,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];
    if (!allowedRoles.includes(token.role as string)) {
      return NextResponse.redirect(
        new URL("/dashboard?forbidden=1", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
