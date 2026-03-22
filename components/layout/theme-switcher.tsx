"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Building, Leaf } from "lucide-react";
import { updateUserTheme } from "@/lib/actions/auth.actions";

const THEMES = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "theme-blue", label: "Bleu Institutionnel", icon: Building },
  { value: "theme-green", label: "Vert AIBEF", icon: Leaf },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply saved theme from session on mount
  useEffect(() => {
    if (session?.user?.theme && session.user.theme !== theme) {
      setTheme(session.user.theme);
    }
  }, [session?.user?.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    if (session?.user) {
      await updateUserTheme(newTheme);
    }
  };

  const currentTheme = (mounted ? THEMES.find((t) => t.value === theme) : null) ?? THEMES[0];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {mounted ? <Icon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="sr-only">Changer le theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => handleThemeChange(t.value)}
            className={theme === t.value ? "bg-accent" : ""}
          >
            <t.icon className="mr-2 h-4 w-4" />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
