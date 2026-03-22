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
import { Loader2, UserPlus, User, Mail, Lock, Phone } from "lucide-react";
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
    defaultValues: { role: "PERSONNEL", typeJournee: "FIXE" },
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
    <div className="space-y-8">
      {/* Mobile-only brand */}
      <div className="text-center lg:hidden">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">TRACKER-AIBEF</h1>
      </div>

      <Card className="w-full max-w-lg mx-auto border-0 shadow-xl shadow-black/5 lg:border lg:shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Creer un compte
          </CardTitle>
          <CardDescription>Nouvel employe TRACKER-AIBEF</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-medium">Nom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="nom" className="h-11 pl-10" {...register("nom")} disabled={isLoading} />
                </div>
                {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom" className="text-sm font-medium">Prenom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="prenom" className="h-11 pl-10" {...register("prenom")} disabled={isLoading} />
                </div>
                {errors.prenom && <p className="text-sm text-destructive">{errors.prenom.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="h-11 pl-10" {...register("email")} disabled={isLoading} />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Nom d&apos;utilisateur</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" className="h-11 pl-10" {...register("username")} disabled={isLoading} />
              </div>
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" className="h-11 pl-10" {...register("password")} disabled={isLoading} />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setValue("role", v as RegisterFormValues["role"])}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choisir un role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole !== "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Antenne</Label>
                <Select onValueChange={(v) => setValue("antenneId", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choisir une antenne" />
                  </SelectTrigger>
                  <SelectContent>
                    {antennes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="telephone" className="text-sm font-medium">Telephone (optionnel)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="telephone" className="h-11 pl-10" {...register("telephone")} disabled={isLoading} />
              </div>
            </div>
            <Button
              type="submit"
              className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Creer le compte
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
