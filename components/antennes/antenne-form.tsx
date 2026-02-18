"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  antenneSchema,
  type AntenneFormValues,
} from "@/lib/validations/antenne.schema";
import { createAntenne, updateAntenne } from "@/lib/actions/antenne.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AntenneFormProps {
  initialData?: {
    id: string;
    nom: string;
    code: string;
    region: string;
    ville: string;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
  };
  onSuccess?: () => void;
}

export function AntenneForm({ initialData, onSuccess }: AntenneFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AntenneFormValues>({
    resolver: zodResolver(antenneSchema),
    defaultValues: {
      nom: initialData?.nom ?? "",
      code: initialData?.code ?? "",
      region: initialData?.region ?? "",
      ville: initialData?.ville ?? "",
      adresse: initialData?.adresse ?? "",
      telephone: initialData?.telephone ?? "",
      email: initialData?.email ?? "",
    },
  });

  async function onSubmit(data: AntenneFormValues) {
    setIsLoading(true);
    try {
      const payload = {
        nom: data.nom,
        code: data.code,
        region: data.region,
        ville: data.ville,
        adresse: data.adresse || undefined,
        telephone: data.telephone || undefined,
        email: data.email || undefined,
      };

      const result = isEdit
        ? await updateAntenne(initialData.id, payload)
        : await createAntenne(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Antenne modifiee avec succes"
          : "Antenne creee avec succes"
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/antennes");
        router.refresh();
      }
    } catch {
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? "Modifier l'antenne" : "Nouvelle antenne"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Modifiez les informations de l'antenne ci-dessous."
            : "Remplissez les informations pour creer une nouvelle antenne."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                placeholder="Antenne d'Abidjan"
                {...register("nom")}
                disabled={isLoading}
              />
              {errors.nom && (
                <p className="text-sm text-destructive">
                  {errors.nom.message}
                </p>
              )}
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="ABJ-01"
                {...register("code")}
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                placeholder="Abidjan"
                {...register("region")}
                disabled={isLoading}
              />
              {errors.region && (
                <p className="text-sm text-destructive">
                  {errors.region.message}
                </p>
              )}
            </div>

            {/* Ville */}
            <div className="space-y-2">
              <Label htmlFor="ville">Ville *</Label>
              <Input
                id="ville"
                placeholder="Abidjan"
                {...register("ville")}
                disabled={isLoading}
              />
              {errors.ville && (
                <p className="text-sm text-destructive">
                  {errors.ville.message}
                </p>
              )}
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                placeholder="Rue des Jardins, Cocody"
                {...register("adresse")}
                disabled={isLoading}
              />
              {errors.adresse && (
                <p className="text-sm text-destructive">
                  {errors.adresse.message}
                </p>
              )}
            </div>

            {/* Telephone */}
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                placeholder="+225 XX XX XX XX"
                {...register("telephone")}
                disabled={isLoading}
              />
              {errors.telephone && (
                <p className="text-sm text-destructive">
                  {errors.telephone.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="antenne@aibef.ci"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Modification..." : "Creation..."}
                </>
              ) : isEdit ? (
                "Modifier"
              ) : (
                "Creer"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/antennes")}
              disabled={isLoading}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
