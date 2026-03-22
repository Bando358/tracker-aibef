"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Loader2, Search, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
  PERMISSIONS,
  ROLE_LABELS,
} from "@/lib/constants";
import { updateUserPermissions } from "@/lib/actions/permission.actions";

interface UserWithPerms {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  antenne: string | null;
  roleLabel: string;
  permissions: string[];
}

interface Props {
  users: UserWithPerms[];
}

export function PermissionPageClient({ users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<UserWithPerms | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("__all__");
  const [savingId, setSavingId] = useState<string | null>(null);

  const allPermKeys = Object.values(PERMISSIONS);
  const roles = [...new Set(users.map((u) => u.role))];

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !search ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "__all__" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  function selectUser(user: UserWithPerms) {
    setSelectedUser(user);
    setSelectedPerms(new Set(user.permissions));
  }

  function togglePerm(perm: string) {
    if (!selectedUser) return;
    const rolePerms = DEFAULT_PERMISSIONS[selectedUser.role] ?? [];
    if (rolePerms.includes(perm)) return; // ne peut pas retirer une perm par defaut

    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  function handleSave() {
    if (!selectedUser) return;
    setSavingId(selectedUser.id);
    startTransition(async () => {
      const result = await updateUserPermissions(
        selectedUser.id,
        Array.from(selectedPerms)
      );
      if (result.success) {
        toast.success(`Permissions de ${selectedUser.prenom} ${selectedUser.nom} mises a jour`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setSavingId(null);
    });
  }

  const hasChanges = (() => {
    if (!selectedUser) return false;
    const currentSet = new Set(selectedUser.permissions);
    if (selectedPerms.size !== currentSet.size) return true;
    for (const p of selectedPerms) {
      if (!currentSet.has(p)) return true;
    }
    return false;
  })();

  const rolePermsForSelected = selectedUser
    ? DEFAULT_PERMISSIONS[selectedUser.role] ?? []
    : [];
  const extraCount = selectedUser
    ? selectedUser.permissions.filter(
        (p) => !rolePermsForSelected.includes(p)
      ).length
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      {/* Liste des utilisateurs */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
          <div className="space-y-2 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 h-8 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tous les roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {ROLE_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u) => {
              const uRolePerms = DEFAULT_PERMISSIONS[u.role] ?? [];
              const uExtra = u.permissions.filter(
                (p) => !uRolePerms.includes(p)
              ).length;

              return (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/50 ${
                    selectedUser?.id === u.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {u.prenom} {u.nom}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {u.roleLabel}
                        {u.antenne ? ` - ${u.antenne}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {u.permissions.length}
                      </Badge>
                      {uExtra > 0 && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          +{uExtra}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Panneau permissions */}
      <div>
        {!selectedUser ? (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Gestion des permissions</p>
              <p className="text-sm mt-1">
                Selectionnez un utilisateur pour gerer ses droits d&apos;acces
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedUser.prenom} {selectedUser.nom}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedUser.roleLabel}
                    </Badge>
                    {selectedUser.antenne && (
                      <span className="text-xs text-muted-foreground">
                        {selectedUser.antenne}
                      </span>
                    )}
                    {extraCount > 0 && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        {extraCount} permission(s) supplementaire(s)
                      </Badge>
                    )}
                  </div>
                </div>
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isPending}
                  >
                    {isPending && savingId === selectedUser.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Enregistrer
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Les permissions grisees sont incluses par defaut avec le role.
                Cochez les permissions supplementaires a accorder.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allPermKeys.map((perm) => {
                  const isRoleDefault = rolePermsForSelected.includes(perm);
                  const isChecked = selectedPerms.has(perm);
                  const isExtra = isChecked && !isRoleDefault;

                  return (
                    <div
                      key={perm}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                        isExtra
                          ? "border-primary/30 bg-primary/5"
                          : isRoleDefault
                            ? "border-border/40 bg-muted/30 cursor-default"
                            : "border-border/40 hover:bg-muted/20"
                      }`}
                      onClick={() => !isRoleDefault && togglePerm(perm)}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={isRoleDefault}
                        onCheckedChange={() => togglePerm(perm)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {PERMISSION_LABELS[perm] ?? perm}
                        </p>
                      </div>
                      {isRoleDefault && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] shrink-0"
                        >
                          Role
                        </Badge>
                      )}
                      {isExtra && (
                        <Badge className="text-[9px] shrink-0 bg-primary/10 text-primary border-primary/20">
                          Extra
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
