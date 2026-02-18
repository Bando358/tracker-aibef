"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  ClipboardList,
  UserCheck,
  Clock,
  Info,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notification.actions";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface NotificationData {
  id: string;
  type: string;
  titre: string;
  message: string;
  lue: boolean;
  lien: string | null;
  createdAt: Date;
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  ACTIVITE_EN_RETARD: AlertTriangle,
  RECOMMANDATION_EN_RETARD: AlertTriangle,
  CONGE_SOUMIS: ClipboardList,
  CONGE_APPROUVE: CalendarCheck,
  CONGE_REFUSE: CalendarX,
  ASSIGNATION_ACTIVITE: UserCheck,
  ASSIGNATION_RECOMMANDATION: UserCheck,
  RAPPEL_POINTAGE: Clock,
  SYSTEME: Info,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  ACTIVITE_EN_RETARD: "text-destructive bg-destructive/10",
  RECOMMANDATION_EN_RETARD: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
  CONGE_SOUMIS: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  CONGE_APPROUVE: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  CONGE_REFUSE: "text-destructive bg-destructive/10",
  ASSIGNATION_ACTIVITE: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
  ASSIGNATION_RECOMMANDATION: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
  RAPPEL_POINTAGE: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  SYSTEME: "text-muted-foreground bg-muted",
};

const POLL_INTERVAL = 15_000; // 15 secondes

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNewNotif, setHasNewNotif] = useState(false);
  const prevCountRef = useRef(0);

  const fetchUnread = useCallback(async () => {
    if (!session?.user?.id) return;
    const count = await getUnreadCount(session.user.id);
    // Detecter les nouvelles notifications
    if (count > prevCountRef.current && prevCountRef.current > 0) {
      setHasNewNotif(true);
      setTimeout(() => setHasNewNotif(false), 3000);
    }
    prevCountRef.current = count;
    setUnreadCount(count);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  async function handleOpen(open: boolean) {
    setIsOpen(open);
    if (open && session?.user?.id) {
      setLoading(true);
      const result = await getNotifications(session.user.id, 1, 30);
      setNotifications(result.data);
      setLoading(false);
    }
  }

  async function handleClickNotification(n: NotificationData) {
    if (!n.lue) {
      await markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === n.id ? { ...notif, lue: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (n.lien) {
      setIsOpen(false);
      router.push(n.lien);
    }
  }

  async function handleMarkAllRead() {
    if (!session?.user?.id) return;
    await markAllAsRead(session.user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    setUnreadCount(0);
  }

  function formatTimeAgo(date: Date) {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  }

  const Icon = hasNewNotif ? BellRing : Bell;

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
        >
          <Icon
            className={`h-4 w-4 transition-transform ${
              hasNewNotif ? "animate-bounce text-primary" : ""
            }`}
          />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] animate-in fade-in zoom-in"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </Button>
          )}
        </div>
        <Separator />

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucune notification
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => {
                const NotifIcon = NOTIFICATION_ICONS[n.type] ?? Bell;
                const colorClass = NOTIFICATION_COLORS[n.type] ?? "text-muted-foreground bg-muted";

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors hover:bg-accent/50 ${
                      !n.lue ? "bg-primary/[0.03]" : ""
                    }`}
                    onClick={() => handleClickNotification(n)}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${colorClass}`}>
                      <NotifIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.lue ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                          {n.titre}
                        </p>
                        {!n.lue && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Read indicator */}
                    {n.lue && (
                      <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
