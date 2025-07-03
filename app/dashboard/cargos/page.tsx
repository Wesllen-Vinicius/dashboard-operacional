"use client"

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconRefresh, IconArchive } from "@tabler/icons-react";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cargo, cargoSchema } from "@/lib/schemas";
import { addCargo, setCargoStatus, updateCargo, subscribeToCargosByStatus } from "@/lib/services/cargos.services";
import { useDataStore } from "@/store/data.store";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Schema para o formulário, omitindo campos gerenciados pelo sistema
const formSchema = cargoSchema.pick({ nome: true });
type CargoFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";

export default function CargosPage() {
    const { canCreate, canEdit, canInactivate } = usePermissions('cargos');
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativo');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string, status: StatusFiltro } | null>(null);

    const form = useForm<CargoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { nome: "" },
    });

    useEffect(() => {
        const unsubscribe = subscribeToCargosByStatus(statusFiltro, setCargos);
        return () => unsubscribe();
    }, [statusFiltro]);

    const handleEdit = (cargo: Cargo) => {
        setIsEditing(true);
        setEditingId(cargo.id!);
        form.reset({ nome: cargo.nome });
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
            await setCargoStatus(id, status);
            toast.success(`Cargo ${actionText === 'inativar' ? 'inativado' : 'reativado'} com sucesso!`);
        } catch (error) {
            toast.error(`Erro ao ${actionText} o cargo.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const resetForm = () => {
        form.reset({ nome: "" });
        setIsEditing(false);
        setEditingId(null);
    }

    const onSubmit: SubmitHandler<CargoFormValues> = async (values) => {
        try {
            if (isEditing && editingId) {
                await updateCargo(editingId, { nome: values.nome });
                toast.success(`Cargo "${values.nome}" atualizado com sucesso!`);
            } else {
                await addCargo({ nome: values.nome });
                toast.success(`Cargo "${values.nome}" adicionado com sucesso!`);
            }
            resetForm();
        } catch {
            toast.error("Ocorreu um erro ao salvar o cargo.");
        }
    };

    const columns: ColumnDef<Cargo>[] = [
        { accessorKey: "nome", header: "Nome do Cargo" },
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
                )
            }
        }
    ];

    const formContent = (
        <fieldset disabled={isEditing ? !canEdit : !canCreate} className="disabled:opacity-70 disabled:pointer-events-none">
            <GenericForm schema={formSchema} onSubmit={onSubmit} formId="cargo-form" form={form}>
                <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Cargo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Açougueiro, Gerente" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end gap-2 mt-4">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="cargo-form">{isEditing ? "Salvar Alterações" : "Adicionar Cargo"}</Button>
                </div>
            </GenericForm>
        </fieldset>
    );

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="ativo">Ativos</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativos</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <PermissionGuard modulo="cargos">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativo' ? 'Inativação' : 'Reativação'}`}
                description={`Tem certeza que deseja ${actionToConfirm?.status === 'inativo' ? 'inativar' : 'reativar'} este cargo?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Cargo" : "Novo Cargo"}
                formContent={formContent}
                tableTitle="Cargos Cadastrados"
                tableContent={(
                    <GenericTable
                        columns={columns}
                        data={cargos}
                        filterPlaceholder="Filtrar por cargo..."
                        filterColumnId="nome"
                        tableControlsComponent={tableControlsComponent}
                    />
                )}
            />
        </PermissionGuard>
    );
}
