"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
  activiteSchema,
  type ActiviteFormValues,
} from "@/lib/validations/activite.schema";
import { createActivite } from "@/lib/actions/activite.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { getEmployesByAntenne } from "@/lib/actions/employe.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { TypeActiviteType, FrequenceType, PeriodiciteType } from "@/types";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface AntenneOption {
  id: string;
  nom: string;
  code: string;
}

interface EmployeOption {
  id: string;
  nom: string;
  prenom: string;
}

interface ActiviteFormProps {
  initialData?: {
    id: string;
    titre: string;
    description: string | null;
    type: TypeActiviteType;
    frequence: FrequenceType | null;
    periodicite: PeriodiciteType | null;
    jourPeriodicite: number | null;
    dateDebut: Date | string | null;
    dateFin: Date | string | null;
    budget: number | null;
    projetId: string | null;
    activiteAntennes: Array<{
      antenneId: string;
      responsableId: string;
      antenne: { id: string; nom: string; code: string };
      responsable: { id: string; nom: string; prenom: string };
    }>;
  };
  onSuccess?: () => void;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export function ActiviteForm({ initialData, onSuccess }: ActiviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [antennes, setAntennes] = useState<AntenneOption[]>([]);
  const [employesByAntenne, setEmployesByAntenne] = useState<
    Record<string, EmployeOption[]>
  >({});
  const [loadingEmployes, setLoadingEmployes] = useState<
    Record<string, boolean>
  >({});

  const form = useForm<ActiviteFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(activiteSchema) as any,
    defaultValues: {
      titre: initialData?.titre ?? "",
      description: initialData?.description ?? "",
      type: initialData?.type ?? "PONCTUELLE",
      frequence: initialData?.frequence ?? null,
      periodicite: initialData?.periodicite ?? null,
      jourPeriodicite: initialData?.jourPeriodicite ?? undefined,
      dateDebut: initialData?.dateDebut
        ? new Date(initialData.dateDebut)
        : undefined as unknown as Date,
      dateFin: initialData?.dateFin
        ? new Date(initialData.dateFin)
        : undefined as unknown as Date,
      budget: initialData?.budget ?? undefined,
      projetId: initialData?.projetId ?? undefined,
      antenneAssignments: initialData?.activiteAntennes?.map((aa: { antenneId: string; responsableId: string }) => ({
        antenneId: aa.antenneId,
        responsableId: aa.responsableId,
      })) ?? [{ antenneId: "", responsableId: "" }],
    },
  });

  const typeActivite = form.watch("type");
  const periodiciteValue = form.watch("periodicite");

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "antenneAssignments",
  });

  // Charger les antennes au montage
  useEffect(() => {
    async function loadAntennes() {
      try {
        const result = await getAllAntennes({ pageSize: 200 });
        setAntennes(
          result.data.map((a) => ({ id: a.id, nom: a.nom, code: a.code }))
        );
      } catch {
        toast.error("Erreur lors du chargement des antennes");
      }
    }
    loadAntennes();
  }, []);

  // Charger les employes initiaux si edition
  useEffect(() => {
    if (initialData?.activiteAntennes) {
      const uniqueAntenneIds = Array.from(
        new Set(initialData.activiteAntennes.map((aa: { antenneId: string }) => aa.antenneId))
      );
      uniqueAntenneIds.forEach((id) => loadEmployesForAntenne(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const loadEmployesForAntenne = useCallback(
    async (antenneId: string) => {
      if (!antenneId || employesByAntenne[antenneId]) return;

      setLoadingEmployes((prev) => ({ ...prev, [antenneId]: true }));
      try {
        const employes = await getEmployesByAntenne(antenneId);
        setEmployesByAntenne((prev) => ({
          ...prev,
          [antenneId]: employes,
        }));
      } catch {
        toast.error("Erreur lors du chargement des employes");
      } finally {
        setLoadingEmployes((prev) => ({ ...prev, [antenneId]: false }));
      }
    },
    [employesByAntenne]
  );

  function onSubmit(values: ActiviteFormValues) {
    startTransition(async () => {
      const result = await createActivite(values);
      if (result.success) {
        toast.success("Activite creee avec succes");
        onSuccess?.();
        router.push("/activites");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ============================================================ */}
        {/* Section 1 : Informations generales                          */}
        {/* ============================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Titre */}
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Titre de l'activite"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description de l'activite"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PONCTUELLE">Ponctuelle</SelectItem>
                        <SelectItem value="PERIODIQUE">Periodique</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Frequence - visible seulement si PERIODIQUE */}
              {typeActivite === "PERIODIQUE" && (
                <FormField
                  control={form.control}
                  name="frequence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequence *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionner une frequence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MENSUELLE">Mensuelle</SelectItem>
                          <SelectItem value="TRIMESTRIELLE">
                            Trimestrielle
                          </SelectItem>
                          <SelectItem value="ANNUELLE">Annuelle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Periodicite - visible seulement si PERIODIQUE */}
            {typeActivite === "PERIODIQUE" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="periodicite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicite *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== "AVANT_JOUR_DU_MOIS") {
                            form.setValue("jourPeriodicite", undefined);
                          }
                        }}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionner la periodicite" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LUNDI">Tous les lundi</SelectItem>
                          <SelectItem value="MARDI">Tous les mardi</SelectItem>
                          <SelectItem value="MERCREDI">Tous les mercredi</SelectItem>
                          <SelectItem value="JEUDI">Tous les jeudi</SelectItem>
                          <SelectItem value="VENDREDI">Tous les vendredi</SelectItem>
                          <SelectItem value="AVANT_JOUR_DU_MOIS">Avant le .. du mois</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Jour du mois - visible seulement si AVANT_JOUR_DU_MOIS */}
                {periodiciteValue === "AVANT_JOUR_DU_MOIS" && (
                  <FormField
                    control={form.control}
                    name="jourPeriodicite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jour du mois *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 15"
                            min={1}
                            max={31}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : Number(val));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Dates - masquees si PERIODIQUE */}
            {typeActivite !== "PERIODIQUE" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Date de debut */}
                <FormField
                  control={form.control}
                  name="dateDebut"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de debut *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "dd/MM/yyyy", {
                                    locale: fr,
                                  })
                                : "Selectionner une date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            locale={fr}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date de fin */}
                <FormField
                  control={form.control}
                  name="dateFin"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de fin *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "dd/MM/yyyy", {
                                    locale: fr,
                                  })
                                : "Selectionner une date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            locale={fr}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Budget */}
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (FCFA)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* Section 2 : Affectation aux antennes                        */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Affectation aux antennes</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ antenneId: "", responsableId: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune affectation. Cliquez sur &quot;Ajouter&quot; pour affecter
                une antenne.
              </p>
            )}

            {fields.map((field, index) => {
              const selectedAntenneId = form.watch(
                `antenneAssignments.${index}.antenneId`
              );
              const employesForRow =
                employesByAntenne[selectedAntenneId] ?? [];
              const isLoadingRow =
                loadingEmployes[selectedAntenneId] ?? false;

              return (
                <div key={field.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-end gap-4">
                    {/* Antenne */}
                    <FormField
                      control={form.control}
                      name={`antenneAssignments.${index}.antenneId`}
                      render={({ field: selectField }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Antenne *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              selectField.onChange(value);
                              // Reset le responsable quand on change d'antenne
                              form.setValue(
                                `antenneAssignments.${index}.responsableId`,
                                ""
                              );
                              loadEmployesForAntenne(value);
                            }}
                            value={selectField.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selectionner une antenne" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {antennes.map((antenne) => (
                                <SelectItem
                                  key={antenne.id}
                                  value={antenne.id}
                                >
                                  {antenne.nom} ({antenne.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Responsable */}
                    <FormField
                      control={form.control}
                      name={`antenneAssignments.${index}.responsableId`}
                      render={({ field: selectField }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Responsable *</FormLabel>
                          <Select
                            onValueChange={selectField.onChange}
                            value={selectField.value}
                            disabled={!selectedAntenneId || isLoadingRow}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingRow
                                      ? "Chargement..."
                                      : "Selectionner un responsable"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employesForRow.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.prenom} {emp.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bouton supprimer */}
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {form.formState.errors.antenneAssignments?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.antenneAssignments.root.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* Boutons de soumission                                       */}
        {/* ============================================================ */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Modifier" : "Creer l'activite"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
