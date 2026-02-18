"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
  Building2,
  Users,
  Activity,
  ClipboardCheck,
  Clock,
  CalendarDays,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";
import type { RoleType } from "@/types";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: RoleType[];
}

const MAIN_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE", "ADMINISTRATIF", "SOIGNANT"],
  },
  {
    title: "Activites",
    url: "/activites",
    icon: Activity,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  },
  {
    title: "Recommandations",
    url: "/recommandations",
    icon: ClipboardCheck,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  },
  {
    title: "Pointages",
    url: "/pointages",
    icon: Clock,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE", "ADMINISTRATIF", "SOIGNANT"],
  },
  {
    title: "Conges",
    url: "/conges",
    icon: CalendarDays,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE", "ADMINISTRATIF", "SOIGNANT"],
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  {
    title: "Antennes",
    url: "/antennes",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Employes",
    url: "/employes",
    icon: Users,
    roles: ["SUPER_ADMIN", "RESPONSABLE_ANTENNE"],
  },
  {
    title: "Journal d'audit",
    url: "/audit-log",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
  },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role as RoleType | undefined;

  const mainItems = useMemo(() => {
    if (!role) return [];
    return MAIN_ITEMS.filter((item) => item.roles.includes(role));
  }, [role]);

  const settingsItems = useMemo(() => {
    if (!role) return [];
    return SETTINGS_ITEMS.filter((item) => item.roles.includes(role));
  }, [role]);

  const isSettingsActive = settingsItems.some((item) =>
    pathname.startsWith(item.url)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">TRACKER-AIBEF</span>
            <span className="text-xs text-muted-foreground">
              Pilotage strategique
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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
                      <SidebarMenuButton tooltip="Parametres">
                        <Settings className="h-4 w-4" />
                        <span>Parametres</span>
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
