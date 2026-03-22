"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  projetSchema,
  type ProjetFormValues,
} from "@/lib/validations/projet.schema";
import { createProjet, updateProjet } from "@/lib/actions/projet.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ProjetFormProps {
  initialData?: {
    id: string;
    code: string;
    nom: string;
    description: string | null;
    dateDebut: Date | string;
    dateFin: Date | string | null;
  };
  onSuccess?: () => void;
}

export function ProjetForm({ initialData, onSuccess }: ProjetFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!initialData;

  const form = useForm<ProjetFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projetSchema) as any,
    defaultValues: {
      code: initialData?.code ?? "",
      nom: initialData?.nom ?? "",
      description: initialData?.description ?? "",
      dateDebut: initialData?.dateDebut
        ? new Date(initialData.dateDebut)
        : undefined as unknown as Date,
      dateFin: initialData?.dateFin
        ? new Date(initialData.dateFin)
        : null,
    },
  });

  async function onSubmit(values: ProjetFormValues) {
    setIsLoading(true);
    try {
      const payload = {
        code: values.code,
        nom: values.nom,
        description: values.description || undefined,
        dateDebut: values.dateDebut,
        dateFin: values.dateFin ?? null,
      };

      const result = isEdit
        ? await updateProjet(initialData.id, payload)
        : await createProjet(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Projet modifie avec succes" : "Projet cree avec succes");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/projets");
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
        <CardTitle>{isEdit ? "Modifier le projet" : "Nouveau projet"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Modifiez les informations du projet ci-dessous."
            : "Remplissez les informations pour creer un nouveau projet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: P1.PNR1.1"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nom */}
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom du projet"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description du projet"
                      rows={3}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: fr })
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
                    <FormLabel>Date de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: fr })
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
                onClick={() => router.push("/projets")}
                disabled={isLoading}
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
