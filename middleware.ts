import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];

// Mapping route -> permission requise
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/projets": "projets",
  "/activites": "activites",
  "/recommandations": "recommandations",
  "/chronogramme": "chronogramme",
  "/missions": "missions",
  "/rapports": "rapports",
  "/pointages": "pointages",
  "/conges": "conges",
  "/antennes": "antennes",
  "/employes": "employes",
  "/empreintes": "empreintes",
  "/formations": "formations",
  "/evaluations": "evaluations",
  "/permissions": "employes",
  "/audit-log": "audit-log",
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

  // SUPER_ADMIN a acces a tout
  if (token.role === "SUPER_ADMIN") {
    return NextResponse.next();
  }

  // Trouver la permission requise pour cette route
  const matchedRoute = Object.keys(ROUTE_PERMISSION_MAP).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const requiredPermission = ROUTE_PERMISSION_MAP[matchedRoute];
    let userPermissions = token.permissions as string[] | undefined;

    // Fallback pour ancien token sans permissions : utiliser les permissions par defaut du role
    if (!userPermissions || userPermissions.length === 0) {
      const role = token.role as string;
      const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
        SUPER_ADMIN: Object.values(ROUTE_PERMISSION_MAP),
        ADMIN_SIMPLE: Object.values(ROUTE_PERMISSION_MAP).filter((p) => p !== "audit-log"),
        RESPONSABLE_ANTENNE: ["dashboard", "projets", "activites", "recommandations", "chronogramme", "missions", "rapports", "pointages", "conges", "antennes", "employes", "formations", "evaluations", "empreintes"],
        ADMIN_ANTENNE: ["dashboard", "projets", "activites", "recommandations", "chronogramme", "missions", "rapports", "pointages", "conges", "antennes", "employes", "formations", "evaluations", "empreintes"],
        PERSONNEL: ["dashboard", "pointages", "conges", "missions"],
        VOLONTAIRE: ["dashboard", "projets", "activites"],
        MAJ: ["dashboard", "projets", "activites"],
      };
      userPermissions = DEFAULT_ROLE_PERMS[role] ?? ["dashboard"];
    }

    if (!userPermissions.includes(requiredPermission)) {
      // Eviter la boucle de redirection sur /dashboard
      if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) {
        return NextResponse.next();
      }
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
