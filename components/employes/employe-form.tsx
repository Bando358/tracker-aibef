"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  employeSchema,
  employeUpdateSchema,
  type EmployeFormValues,
  type EmployeUpdateFormValues,
} from "@/lib/validations/employe.schema";
import { createEmploye, updateEmploye } from "@/lib/actions/employe.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { ROLE_LABELS } from "@/lib/constants";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

import type { RoleType, TypeJourneeType } from "@/types";
import type { UserWithAntenne } from "@/lib/actions/employe.actions";

interface EmployeFormProps {
  initialData?: UserWithAntenne;
  onSuccess?: () => void;
}

export function EmployeForm({ initialData, onSuccess }: EmployeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [antennes, setAntennes] = useState<{ id: string; nom: string; ville: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const isEdit = !!initialData;

  const form = useForm<EmployeFormValues | EmployeUpdateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? employeUpdateSchema : employeSchema) as any,
    defaultValues: {
      nom: initialData?.nom ?? "",
      prenom: initialData?.prenom ?? "",
      email: initialData?.email ?? "",
      username: initialData?.username ?? "",
      password: "",
      role: (initialData?.role ?? "SOIGNANT") as RoleType,
      antenneId: initialData?.antenneId ?? null,
      typeJournee: (initialData?.typeJournee ?? "FIXE") as TypeJourneeType,
      telephone: initialData?.telephone ?? "",
    },
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    async function loadAntennes() {
      try {
        const result = await getAllAntennes({ pageSize: 200 });
        setAntennes(result.data);
      } catch {
        toast.error("Erreur lors du chargement des antennes");
      }
    }
    loadAntennes();
  }, []);

  function onSubmit(values: EmployeFormValues | EmployeUpdateFormValues) {
    startTransition(async () => {
      const submitData = {
        ...values,
        antenneId: selectedRole === "SUPER_ADMIN" ? null : values.antenneId,
        telephone: values.telephone || null,
      };

      // For update, remove empty password
      if (isEdit && (!submitData.password || submitData.password === "")) {
        delete (submitData as EmployeUpdateFormValues).password;
      }

      const result = isEdit
        ? await updateEmploye(initialData.id, submitData)
        : await createEmploye(submitData);

      if (result.success) {
        toast.success(
          isEdit
            ? "Employe modifie avec succes"
            : "Employe cree avec succes"
        );
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/employes");
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? "Modifier l'employe" : "Nouvel employe"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Modifiez les informations de l'employe"
            : "Remplissez les informations pour creer un nouvel employe"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Nom */}
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de famille" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prenom */}
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prenom</FormLabel>
                    <FormControl>
                      <Input placeholder="Prenom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemple.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telephone */}
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+225 XX XX XX XX"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d&apos;utilisateur</FormLabel>
                    <FormControl>
                      <Input placeholder="nom.utilisateur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mot de passe
                      {isEdit && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="ml-2 h-auto p-0 text-xs"
                          onClick={() => {
                            setChangePassword(!changePassword);
                            if (changePassword) {
                              form.setValue("password", "");
                            }
                          }}
                        >
                          {changePassword
                            ? "Annuler la modification"
                            : "Modifier le mot de passe"}
                        </Button>
                      )}
                    </FormLabel>
                    {(!isEdit || changePassword) && (
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe"
                            {...field}
                            value={field.value ?? ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionnez un role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(ROLE_LABELS) as Array<
                            keyof typeof ROLE_LABELS
                          >
                        ).map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type Journee */}
              <FormField
                control={form.control}
                name="typeJournee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de journee</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionnez le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXE">Fixe</SelectItem>
                        <SelectItem value="VARIABLE">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Antenne - hidden when SUPER_ADMIN */}
              {selectedRole !== "SUPER_ADMIN" && (
                <FormField
                  control={form.control}
                  name="antenneId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Antenne</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "__none__" ? null : value)
                        }
                        defaultValue={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionnez une antenne" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Aucune antenne
                          </SelectItem>
                          {antennes.map((antenne) => (
                            <SelectItem key={antenne.id} value={antenne.id}>
                              {antenne.nom} - {antenne.ville}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Enregistrer les modifications" : "Creer l'employe"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
