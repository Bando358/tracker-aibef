"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  recommandationSchema,
  type RecommandationFormValues,
} from "@/lib/validations/recommandation.schema";
import { createRecommandation } from "@/lib/actions/recommandation.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { getEmployesByAntenne } from "@/lib/actions/employe.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AntenneOption {
  id: string;
  nom: string;
}

interface EmployeOption {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

interface RecommandationFormProps {
  initialData?: {
    id: string;
    titre: string;
    description: string;
    source: "ACTIVITE" | "REUNION" | "SUPERVISION" | "FORMATION";
    typeResolution: "PERMANENTE" | "PONCTUELLE" | "PERIODIQUE";
    priorite: "HAUTE" | "MOYENNE" | "BASSE";
    dateEcheance: Date;
    frequence?: "MENSUELLE" | "TRIMESTRIELLE" | "ANNUELLE" | null;
    activiteId?: string | null;
    antenneId?: string | null;
    responsableIds: string[];
    observations?: string | null;
  };
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  { value: "ACTIVITE", label: "Activite" },
  { value: "REUNION", label: "Reunion" },
  { value: "SUPERVISION", label: "Supervision" },
  { value: "FORMATION", label: "Formation" },
] as const;

const TYPE_RESOLUTION_OPTIONS = [
  { value: "PERMANENTE", label: "Permanente" },
  { value: "PONCTUELLE", label: "Ponctuelle" },
  { value: "PERIODIQUE", label: "Periodique" },
] as const;

const PRIORITE_OPTIONS = [
  { value: "HAUTE", label: "Haute" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "BASSE", label: "Basse" },
] as const;

const FREQUENCE_OPTIONS = [
  { value: "MENSUELLE", label: "Mensuelle" },
  { value: "TRIMESTRIELLE", label: "Trimestrielle" },
  { value: "ANNUELLE", label: "Annuelle" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommandationForm({
  initialData,
  onSuccess,
}: RecommandationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [antennes, setAntennes] = useState<AntenneOption[]>([]);
  const [employes, setEmployes] = useState<EmployeOption[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);

  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecommandationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recommandationSchema) as any,
    defaultValues: {
      titre: initialData?.titre ?? "",
      description: initialData?.description ?? "",
      source: initialData?.source ?? undefined,
      typeResolution: initialData?.typeResolution ?? undefined,
      priorite: initialData?.priorite ?? "MOYENNE",
      dateEcheance: initialData?.dateEcheance ?? undefined,
      frequence: initialData?.frequence ?? undefined,
      activiteId: initialData?.activiteId ?? undefined,
      antenneId: initialData?.antenneId ?? undefined,
      responsableIds: initialData?.responsableIds ?? [],
      observations: initialData?.observations ?? "",
    },
  });

  const watchedTypeResolution = watch("typeResolution");
  const watchedAntenneId = watch("antenneId");

  // Load antennes on mount
  useEffect(() => {
    async function loadAntennes() {
      try {
        const result = await getAllAntennes({ pageSize: 100 });
        setAntennes(
          result.data.map((a) => ({ id: a.id, nom: a.nom }))
        );
      } catch {
        toast.error("Erreur lors du chargement des antennes");
      }
    }
    loadAntennes();
  }, []);

  // Load employes when antenne changes
  const loadEmployes = useCallback(async (antenneId: string) => {
    setLoadingEmployes(true);
    try {
      const result = await getEmployesByAntenne(antenneId);
      setEmployes(result);
    } catch {
      toast.error("Erreur lors du chargement des employes");
      setEmployes([]);
    } finally {
      setLoadingEmployes(false);
    }
  }, []);

  useEffect(() => {
    if (watchedAntenneId) {
      loadEmployes(watchedAntenneId);
    } else {
      setEmployes([]);
    }
  }, [watchedAntenneId, loadEmployes]);

  async function onSubmit(data: RecommandationFormValues) {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        frequence:
          data.typeResolution === "PERIODIQUE" ? data.frequence : null,
      };

      const result = await createRecommandation(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Recommandation modifiee avec succes"
          : "Recommandation creee avec succes"
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/recommandations");
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
          {isEdit ? "Modifier la recommandation" : "Nouvelle recommandation"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Modifiez les informations de la recommandation ci-dessous."
            : "Remplissez les informations pour creer une nouvelle recommandation."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              placeholder="Titre de la recommandation"
              {...register("titre")}
              disabled={isLoading}
            />
            {errors.titre && (
              <p className="text-sm text-destructive">
                {errors.titre.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Description detaillee de la recommandation"
              rows={4}
              {...register("description")}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Source */}
            <div className="space-y-2">
              <Label>Source *</Label>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner la source" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.source && (
                <p className="text-sm text-destructive">
                  {errors.source.message}
                </p>
              )}
            </div>

            {/* Type de resolution */}
            <div className="space-y-2">
              <Label>Type de resolution *</Label>
              <Controller
                control={control}
                name="typeResolution"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_RESOLUTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.typeResolution && (
                <p className="text-sm text-destructive">
                  {errors.typeResolution.message}
                </p>
              )}
            </div>

            {/* Priorite */}
            <div className="space-y-2">
              <Label>Priorite *</Label>
              <Controller
                control={control}
                name="priorite"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner la priorite" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priorite && (
                <p className="text-sm text-destructive">
                  {errors.priorite.message}
                </p>
              )}
            </div>

            {/* Date d'echeance */}
            <div className="space-y-2">
              <Label htmlFor="dateEcheance">Date d&apos;echeance *</Label>
              <Input
                id="dateEcheance"
                type="date"
                {...register("dateEcheance")}
                disabled={isLoading}
              />
              {errors.dateEcheance && (
                <p className="text-sm text-destructive">
                  {errors.dateEcheance.message}
                </p>
              )}
            </div>

            {/* Frequence (conditional) */}
            {watchedTypeResolution === "PERIODIQUE" && (
              <div className="space-y-2">
                <Label>Frequence *</Label>
                <Controller
                  control={control}
                  name="frequence"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner la frequence" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.frequence && (
                  <p className="text-sm text-destructive">
                    {errors.frequence.message}
                  </p>
                )}
              </div>
            )}

            {/* Antenne */}
            <div className="space-y-2">
              <Label>Antenne</Label>
              <Controller
                control={control}
                name="antenneId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset responsables when antenne changes
                      setValue("responsableIds", []);
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner l'antenne" />
                    </SelectTrigger>
                    <SelectContent>
                      {antennes.map((antenne) => (
                        <SelectItem key={antenne.id} value={antenne.id}>
                          {antenne.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.antenneId && (
                <p className="text-sm text-destructive">
                  {errors.antenneId.message}
                </p>
              )}
            </div>
          </div>

          {/* Responsables (multi-select checkboxes) */}
          <div className="space-y-2">
            <Label>Responsables *</Label>
            {!watchedAntenneId && (
              <p className="text-sm text-muted-foreground">
                Veuillez d&apos;abord selectionner une antenne pour afficher les
                employes disponibles.
              </p>
            )}
            {watchedAntenneId && loadingEmployes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des employes...
              </div>
            )}
            {watchedAntenneId && !loadingEmployes && employes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun employe trouve pour cette antenne.
              </p>
            )}
            {watchedAntenneId && !loadingEmployes && employes.length > 0 && (
              <Controller
                control={control}
                name="responsableIds"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3">
                    {employes.map((emp) => {
                      const isChecked = field.value?.includes(emp.id) ?? false;
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 cursor-pointer rounded-md p-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              if (checked) {
                                field.onChange([...current, emp.id]);
                              } else {
                                field.onChange(
                                  current.filter((id) => id !== emp.id)
                                );
                              }
                            }}
                            disabled={isLoading}
                          />
                          <span className="text-sm">
                            {emp.prenom} {emp.nom}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            )}
            {errors.responsableIds && (
              <p className="text-sm text-destructive">
                {errors.responsableIds.message}
              </p>
            )}
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              placeholder="Observations supplementaires (optionnel)"
              rows={3}
              {...register("observations")}
              disabled={isLoading}
            />
            {errors.observations && (
              <p className="text-sm text-destructive">
                {errors.observations.message}
              </p>
            )}
          </div>

          {/* Actions */}
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
              onClick={() => router.push("/recommandations")}
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
