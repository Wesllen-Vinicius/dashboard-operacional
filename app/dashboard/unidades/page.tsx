"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLock } from "@tabler/icons-react";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Unidade, unidadeSchema } from "@/lib/schemas";
import { addUnidade, updateUnidade, setUnidadeStatus } from "@/lib/services/unidades.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import z from "zod";

type UnidadeFormValues = z.infer<typeof unidadeSchema>;

export default function UnidadesPage() {
    const unidades = useDataStore((state) => state.unidades);
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const isReadOnly = role !== 'ADMINISTRADOR';

    const form = useForm<UnidadeFormValues>({
        resolver: zodResolver(unidadeSchema),
        defaultValues: { nome: "", sigla: "" },
    });

    const handleEdit = (unidade: Unidade) => {
        if(isReadOnly) return;
        form.reset(unidade);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar esta unidade?")) return;
        try {
            await setUnidadeStatus(id, 'inativo');
            toast.success("Unidade inativada com sucesso!");
        } catch {
            toast.error("Erro ao inativar a unidade.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", nome: "", sigla: "" });
        setIsEditing(false);
    };

    const onSubmit = async (values: UnidadeFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateUnidade(id, data);
                toast.success("Unidade atualizada com sucesso!");
            } else {
                await addUnidade(data);
                toast.success("Unidade cadastrada com sucesso!");
            }
            resetForm();
        } catch {
            toast.error("Ocorreu um erro ao salvar a unidade.");
        }
    };

    const columns: ColumnDef<Unidade>[] = [
        { accessorKey: "nome", header: "Nome" },
        { accessorKey: "sigla", header: "Sigla" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isReadOnly}>
                                      <IconPencil className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Editar Unidade</p></TooltipContent>
                          </Tooltip>
                          {!isReadOnly && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}>
                                          <IconTrash className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Inativar Unidade</p></TooltipContent>
                              </Tooltip>
                          )}
                        </TooltipProvider>
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <fieldset disabled={isReadOnly} className="disabled:opacity-70">
            <GenericForm schema={unidadeSchema} onSubmit={onSubmit} formId="unidade-form" form={form}>
                <div className="space-y-4">
                    <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome da Unidade</FormLabel><FormControl><Input placeholder="Ex: Quilograma, Litro, Pacote" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="sigla" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Sigla</FormLabel><FormControl><Input placeholder="Ex: kg, lt, pct" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="unidade-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
                </div>
            </GenericForm>
            {isReadOnly && (
                <Alert variant="destructive" className="mt-6">
                    <IconLock className="h-4 w-4" />
                    <AlertTitle>Acesso Restrito</AlertTitle>
                    <AlertDescription>Apenas administradores podem gerenciar unidades.</AlertDescription>
                </Alert>
            )}
        </fieldset>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={unidades}
            filterPlaceholder="Filtrar por nome..."
            filterColumnId="nome"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Unidade" : "Nova Unidade de Medida"}
            formContent={formContent}
            tableTitle="Unidades Cadastradas"
            tableContent={tableContent}
        />
    );
}
