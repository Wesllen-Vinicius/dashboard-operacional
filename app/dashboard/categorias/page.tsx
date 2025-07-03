"use client"

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconArchive, IconRefresh } from "@tabler/icons-react";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Categoria, categoriaSchema } from "@/lib/schemas";
import { addCategoria, updateCategoria, setCategoriaStatus, subscribeToCategoriasByStatus } from "@/lib/services/categorias.services";
import { useDataStore } from "@/store/data.store";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Schema para o formulário, omitindo campos gerenciados pelo sistema
const formSchema = categoriaSchema.pick({ nome: true });
type CategoriaFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";

export default function CategoriasPage() {
    const { canCreate, canEdit, canInactivate } = usePermissions('categorias');
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativo');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string; status: StatusFiltro } | null>(null);

    const form = useForm<CategoriaFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { nome: "" },
    });

    useEffect(() => {
        const unsubscribe = subscribeToCategoriasByStatus(statusFiltro, setCategorias);
        return () => unsubscribe();
    }, [statusFiltro]);


    const handleEdit = (categoria: Categoria) => {
        setIsEditing(true);
        setEditingId(categoria.id!);
        form.reset({ nome: categoria.nome });
    };

    const handleStatusAction = (id: string, newStatus: StatusFiltro) => {
        setActionToConfirm({ id, status: newStatus });
        setIsConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!actionToConfirm) return;
        const { id, status } = actionToConfirm;
        const actionText = status === 'inativo' ? 'inativar' : 'reativar';
        try {
            await setCategoriaStatus(id, status);
            toast.success(`Categoria ${actionText === 'inativar' ? 'inativada' : 'reativada'} com sucesso!`);
        } catch {
            toast.error(`Erro ao ${actionText} a categoria.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const resetForm = () => {
        form.reset({ nome: "" });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit: SubmitHandler<CategoriaFormValues> = async (values) => {
        try {
            if (isEditing && editingId) {
                await updateCategoria(editingId, { nome: values.nome });
                toast.success("Categoria atualizada com sucesso!");
            } else {
                await addCategoria({ nome: values.nome });
                toast.success("Categoria cadastrada com sucesso!");
            }
            resetForm();
        } catch {
            toast.error("Ocorreu um erro ao salvar a categoria.");
        }
    };

    const columns: ColumnDef<Categoria>[] = [
        { accessorKey: "nome", header: "Nome da Categoria" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!canEdit}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {statusFiltro === 'ativo' ? (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusAction(item.id!, 'inativo')} disabled={!canInactivate}>
                                <IconArchive className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusAction(item.id!, 'ativo')} disabled={!canInactivate}>
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <fieldset disabled={isEditing ? !canEdit : !canCreate} className="disabled:opacity-70 disabled:pointer-events-none">
            <GenericForm schema={formSchema} onSubmit={onSubmit} formId="categoria-form" form={form}>
                <div className="space-y-4">
                    <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome da Categoria</FormLabel><FormControl><Input placeholder="Ex: Higiene, Ferramentas, Escritório" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="categoria-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
                </div>
            </GenericForm>
        </fieldset>
    );

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="ativo">Ativas</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativas</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <PermissionGuard modulo="categorias">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativo' ? 'Inativação' : 'Reativação'}`}
                description={`Tem certeza que deseja ${actionToConfirm?.status === 'inativo' ? 'inativar' : 'reativar'} esta categoria?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Categoria" : "Nova Categoria de Item"}
                formContent={formContent}
                tableTitle="Categorias Cadastradas"
                tableContent={(
                    <GenericTable
                        columns={columns}
                        data={categorias}
                        filterPlaceholder="Filtrar por nome..."
                        filterColumnId="nome"
                        tableControlsComponent={tableControlsComponent}
                    />
                )}
            />
        </PermissionGuard>
    );
}
