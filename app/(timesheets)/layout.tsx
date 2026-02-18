import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function TimesheetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
