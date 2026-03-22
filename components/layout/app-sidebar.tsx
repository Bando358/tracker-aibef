"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NavUser } from "@/components/layout/nav-user";
import {
  LayoutDashboard,
  Users,
  Activity,
  ClipboardCheck,
  Clock,
  CalendarDays,
  Shield,
  Fingerprint,
  BarChart3,
  Settings,
  ChevronRight,
  FolderKanban,
  Plane,
  GraduationCap,
  Star,
  GanttChart,
  KeyRound,
} from "lucide-react";

function LogoIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-tracker.png"
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string; // cle de permission requise
}

const MAIN_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { title: "Projets", url: "/projets", icon: FolderKanban, permission: "projets" },
  { title: "Activites", url: "/activites", icon: Activity, permission: "activites" },
  { title: "Recommandations", url: "/recommandations", icon: ClipboardCheck, permission: "recommandations" },
  { title: "Chronogramme", url: "/chronogramme", icon: GanttChart, permission: "chronogramme" },
  { title: "Missions", url: "/missions", icon: Plane, permission: "missions" },
  { title: "Rapports", url: "/rapports", icon: BarChart3, permission: "rapports" },
  { title: "Pointages", url: "/pointages", icon: Clock, permission: "pointages" },
  { title: "Conges", url: "/conges", icon: CalendarDays, permission: "conges" },
];

const SETTINGS_ITEMS: NavItem[] = [
  { title: "Antennes", url: "/antennes", icon: LogoIcon, permission: "antennes" },
  { title: "Employes", url: "/employes", icon: Users, permission: "employes" },
  { title: "Empreintes digitales", url: "/empreintes", icon: Fingerprint, permission: "empreintes" },
  { title: "Formations", url: "/formations", icon: GraduationCap, permission: "formations" },
  { title: "Evaluations", url: "/evaluations", icon: Star, permission: "evaluations" },
  { title: "Permissions", url: "/permissions", icon: KeyRound, permission: "employes" },
  { title: "Journal d'audit", url: "/audit-log", icon: Shield, permission: "audit-log" },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role as string | undefined;
  const tokenPermissions = session?.user?.permissions as string[] | undefined;
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Permissions effectives : du token si disponible, sinon fallback sur les permissions par defaut du role
  const effectivePermissions = useMemo(() => {
    if (!role) return [];
    if (isSuperAdmin) return Object.values(PERMISSIONS);
    if (tokenPermissions && tokenPermissions.length > 0) return tokenPermissions;
    // Fallback pour ancien token sans permissions
    return DEFAULT_PERMISSIONS[role] ?? [];
  }, [role, tokenPermissions, isSuperAdmin]);

  const mainItems = useMemo(() => {
    if (!session?.user) return [];
    return MAIN_ITEMS.filter((item) => effectivePermissions.includes(item.permission));
  }, [session?.user, effectivePermissions]);

  const settingsItems = useMemo(() => {
    if (!session?.user) return [];
    return SETTINGS_ITEMS.filter((item) => effectivePermissions.includes(item.permission));
  }, [session?.user, effectivePermissions]);

  const isSettingsActive = settingsItems.some((item) =>
    pathname.startsWith(item.url)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="group flex items-center justify-center">
          <Image
            src="/logo-tracker.png"
            alt="TRACKER-AIBEF"
            width={180}
            height={40}
            className="w-auto h-[55px] object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    className="transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {settingsItems.length > 0 && (
                <Collapsible
                  asChild
                  defaultOpen={isSettingsActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Parametres" className="transition-all duration-200">
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">Parametres</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {settingsItems.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname.startsWith(item.url)}
                              className="transition-all duration-200"
                            >
                              <Link href={item.url}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
