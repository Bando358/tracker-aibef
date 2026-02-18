"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth.schema";
import { registerUser } from "@/lib/actions/auth.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [antennes, setAntennes] = useState<{ id: string; nom: string }[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { role: "SOIGNANT", typeJournee: "FIXE" },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    getAllAntennes({ pageSize: 100 }).then((result) => {
      if (result.data) setAntennes(result.data.map((a) => ({ id: a.id, nom: a.nom })));
    });
  }, []);

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      const result = await registerUser(data);
      if (result.success) {
        toast.success("Compte cree avec succes");
        router.push("/login");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur lors de la creation du compte");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Creer un compte</CardTitle>
        <CardDescription>Nouvel employe TRACKER-AIBEF</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" {...register("nom")} disabled={isLoading} />
              {errors.nom && (
                <p className="text-sm text-destructive">{errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prenom</Label>
              <Input id="prenom" {...register("prenom")} disabled={isLoading} />
              {errors.prenom && (
                <p className="text-sm text-destructive">
                  {errors.prenom.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nom d&apos;utilisateur</Label>
            <Input
              id="username"
              {...register("username")}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) =>
                setValue("role", v as RegisterFormValues["role"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRole !== "SUPER_ADMIN" && (
            <div className="space-y-2">
              <Label>Antenne</Label>
              <Select
                onValueChange={(v) => setValue("antenneId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une antenne" />
                </SelectTrigger>
                <SelectContent>
                  {antennes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone (optionnel)</Label>
            <Input
              id="telephone"
              {...register("telephone")}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation...
              </>
            ) : (
              "Creer le compte"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
