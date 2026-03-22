"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { missionSchema, type MissionFormValues } from "@/lib/validations/mission.schema";
import { createMission, updateMission } from "@/lib/actions/mission.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { getEmployesByAntenne } from "@/lib/actions/employe.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

interface EmployeOption { id: string; nom: string; prenom: string }
interface AntenneOption { id: string; nom: string }

interface MissionFormProps {
  initialData?: {
    id: string;
    objet: string;
    lieu: string;
    dateDebut: Date | string;
    dateFin: Date | string;
    perDiem: number | null;
    responsableId: string;
    observations: string | null;
  };
}

export function MissionForm({ initialData }: MissionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [antennes, setAntennes] = useState<AntenneOption[]>([]);
  const [selectedAntenneId, setSelectedAntenneId] = useState("");
  const [employes, setEmployes] = useState<EmployeOption[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);

  const form = useForm<MissionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(missionSchema) as any,
    defaultValues: {
      objet: initialData?.objet ?? "",
      lieu: initialData?.lieu ?? "",
      dateDebut: initialData?.dateDebut ? new Date(initialData.dateDebut) : undefined as unknown as Date,
      dateFin: initialData?.dateFin ? new Date(initialData.dateFin) : undefined as unknown as Date,
      perDiem: initialData?.perDiem ?? undefined,
      responsableId: initialData?.responsableId ?? "",
      observations: initialData?.observations ?? "",
    },
  });

  useEffect(() => {
    async function loadAntennes() {
      const result = await getAllAntennes({ pageSize: 200 });
      setAntennes(result.data.map((a) => ({ id: a.id, nom: a.nom })));
    }
    loadAntennes();
  }, []);

  async function loadEmployes(antenneId: string) {
    setLoadingEmployes(true);
    try {
      const data = await getEmployesByAntenne(antenneId);
      setEmployes(data);
    } catch {
      toast.error("Erreur lors du chargement des employes");
    } finally {
      setLoadingEmployes(false);
    }
  }

  function onSubmit(values: MissionFormValues) {
    startTransition(async () => {
      const result = initialData
        ? await updateMission(initialData.id, values)
        : await createMission(values);
      if (result.success) {
        toast.success(initialData ? "Mission modifiee" : "Mission creee");
        router.push(initialData ? `/missions/${initialData.id}` : "/missions");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations de la mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="objet" render={({ field }) => (
              <FormItem>
                <FormLabel>Objet de la mission *</FormLabel>
                <FormControl><Input placeholder="Objet de la mission" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lieu" render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu *</FormLabel>
                <FormControl><Input placeholder="Lieu de la mission" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="dateDebut" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de debut *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: fr }) : "Selectionner"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} locale={fr} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dateFin" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de fin *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: fr }) : "Selectionner"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} locale={fr} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="perDiem" render={({ field }) => (
              <FormItem>
                <FormLabel>Per diem (FCFA)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Selection antenne puis responsable */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Antenne du responsable</label>
                <Select
                  value={selectedAntenneId}
                  onValueChange={(v) => {
                    setSelectedAntenneId(v);
                    form.setValue("responsableId", "");
                    loadEmployes(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selectionner une antenne" /></SelectTrigger>
                  <SelectContent>
                    {antennes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField control={form.control} name="responsableId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedAntenneId || loadingEmployes}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingEmployes ? "Chargement..." : "Selectionner"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="observations" render={({ field }) => (
              <FormItem>
                <FormLabel>Observations</FormLabel>
                <FormControl>
                  <Textarea placeholder="Observations (optionnel)" rows={3} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Modifier" : "Creer la mission"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
