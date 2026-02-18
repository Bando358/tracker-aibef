"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { congeSchema, type CongeFormValues } from "@/lib/validations/conge.schema";
import { createConge, submitConge } from "@/lib/actions/conge.actions";
import { computeBusinessDays } from "@/services/conge.service";
import { TYPE_CONGE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Loader2, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface CongeFormProps {
  initialData?: {
    type?: string;
    dateDebut?: string;
    dateFin?: string;
    motif?: string;
  };
  onSuccess?: () => void;
}

const typeCongeEntries = Object.entries(TYPE_CONGE_LABELS) as [string, string][];

export function CongeForm({ initialData, onSuccess }: CongeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [computedDays, setComputedDays] = useState<number>(0);
  const router = useRouter();

  const form = useForm<CongeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(congeSchema) as any,
    defaultValues: {
      type: (initialData?.type as CongeFormValues["type"]) ?? undefined,
      dateDebut: initialData?.dateDebut
        ? new Date(initialData.dateDebut)
        : undefined,
      dateFin: initialData?.dateFin
        ? new Date(initialData.dateFin)
        : undefined,
      motif: initialData?.motif ?? "",
    },
  });

  const dateDebut = form.watch("dateDebut");
  const dateFin = form.watch("dateFin");

  // Recalculer les jours ouvres lorsque les dates changent
  useEffect(() => {
    if (dateDebut && dateFin) {
      const d1 = new Date(dateDebut);
      const d2 = new Date(dateFin);
      if (d2 >= d1) {
        const days = computeBusinessDays(d1, d2);
        setComputedDays(days);
      } else {
        setComputedDays(0);
      }
    } else {
      setComputedDays(0);
    }
  }, [dateDebut, dateFin]);

  function handleSaveDraft(values: CongeFormValues) {
    startTransition(async () => {
      const result = await createConge(values);
      if (result.success) {
        toast.success("Brouillon enregistre");
        onSuccess?.();
        router.push("/conges");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSubmit(values: CongeFormValues) {
    startTransition(async () => {
      // 1. Creer le brouillon
      const createResult = await createConge(values);
      if (!createResult.success) {
        toast.error(createResult.error);
        return;
      }

      // 2. Soumettre directement
      const submitResult = await submitConge(createResult.data.id);
      if (submitResult.success) {
        toast.success("Demande de conge soumise avec succes");
        onSuccess?.();
        router.push("/conges");
        router.refresh();
      } else {
        toast.error(submitResult.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Nouvelle demande de conge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {/* Type de conge */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de conge</FormLabel>
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
                      {typeCongeEntries.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateDebut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de debut</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? format(new Date(field.value), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val ? new Date(val) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? format(new Date(field.value), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val ? new Date(val) : undefined);
                        }}
                        min={
                          dateDebut
                            ? format(new Date(dateDebut), "yyyy-MM-dd")
                            : undefined
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Jours ouvres calcules */}
            {computedDays > 0 && (
              <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
                <p className="text-sm text-blue-700">
                  Nombre de jours ouvres :{" "}
                  <span className="font-bold text-lg">{computedDays}</span>{" "}
                  jour{computedDays > 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Motif */}
            <FormField
              control={form.control}
              name="motif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motif</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Decrivez le motif de votre demande..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(handleSaveDraft)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer en brouillon
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Soumettre la demande
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
