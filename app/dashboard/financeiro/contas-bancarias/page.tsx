"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IconPencil, IconArchive, IconRefresh } from "@tabler/icons-react";
import { fetchBancos, Banco } from "@/lib/services/bancos.service";
import { CrudLayout } from "@/components/crud-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { contaBancariaSchema, ContaBancaria } from "@/lib/schemas";
import { addContaBancaria, updateContaBancaria, setContaBancariaStatus, subscribeToContasBancariasByStatus } from "@/lib/services/contasBancarias.services";
import { GenericTable } from "@/components/generic-table";
import { useAuthStore } from "@/store/auth.store";
import { z } from "zod";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DetailsSubRow } from "@/components/details-sub-row";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const formSchema = contaBancariaSchema.pick({
    nomeConta: true, banco: true, agencia: true, conta: true, tipo: true, saldoInicial: true
});

type FormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativa" | "inativa";

export default function ContasBancariasPage() {
    const { canCreate, canEdit, canInactivate } = usePermissions('financeiro');
    const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
    const { user, isLoading: isAuthLoading } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bancosList, setBancosList] = useState<Banco[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativa');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string, status: StatusFiltro } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { nomeConta: "", banco: "", agencia: "", conta: "", tipo: "Conta Corrente", saldoInicial: 0 },
    });

    useEffect(() => {
        fetchBancos().then(setBancosList).catch(console.error);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToContasBancariasByStatus(statusFiltro, setContasBancarias);
        return () => unsubscribe();
    }, [statusFiltro]);


    const bancosOptions = bancosList
        .filter((b) => b.code && b.name)
        .map((b) => ({ label: `${b.code} – ${b.name}`, value: `${b.code} – ${b.name}` }));

    const handleEdit = (data: ContaBancaria) => {
        setIsEditing(true);
        setEditingId(data.id!);
        form.reset(data);
        if(data.banco) form.setValue("banco", data.banco);
    };

    const handleStatusAction = (id: string, newStatus: StatusFiltro) => {
        setActionToConfirm({ id, status: newStatus });
        setIsConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!actionToConfirm) return;
        const { id, status } = actionToConfirm;
        const actionText = status === 'inativa' ? 'inativar' : 'reativar';
        try {
            await setContaBancariaStatus(id, status);
            toast.success(`Conta ${actionText === 'inativar' ? 'inativada' : 'reativada'} com sucesso!`);
        } catch {
            toast.error(`Erro ao ${actionText} a conta.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const resetForm = () => {
        form.reset({ nomeConta: "", banco: "", agencia: "", conta: "", tipo: "Conta Corrente", saldoInicial: 0 });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        if (!user) return toast.error("Usuário não autenticado.");

        const payload = { ...values, saldoInicial: values.saldoInicial || 0 };

        try {
            if (isEditing && editingId) {
                await updateContaBancaria(editingId, payload);
                toast.success("Conta atualizada!");
            } else {
                await addContaBancaria(payload, user);
                toast.success("Conta adicionada!");
            }
            resetForm();
        } catch(e: any) {
            toast.error("Erro ao salvar conta.", { description: e.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<ContaBancaria> }) => {
        const conta = row.original;
        const details = [
            { label: "Tipo de Conta", value: conta.tipo },
            { label: "Saldo Inicial", value: `R$ ${(conta.saldoInicial ?? 0).toFixed(2)}` },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<ContaBancaria>[] = [
        { header: "Nome da Conta", accessorKey: "nomeConta" },
        { header: "Banco", accessorKey: "banco" },
        { header: "Agência", accessorKey: "agencia" },
        { header: "Conta", accessorKey: "conta" },
        { header: "Saldo Atual", accessorKey: "saldoAtual", cell: ({ row }) => `R$ ${(row.original.saldoAtual ?? 0).toFixed(2)}` },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!canEdit}><IconPencil className="h-4 w-4" /></Button>
                    {statusFiltro === 'ativa'
                        ? <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusAction(row.original.id!, 'inativa')} disabled={!canInactivate}><IconArchive className="h-4 w-4" /></Button>
                        : <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusAction(row.original.id!, 'ativa')} disabled={!canInactivate}><IconRefresh className="h-4 w-4" /></Button>
                    }
                </div>
            )
        },
    ];

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="ativa">Ativas</ToggleGroupItem>
                <ToggleGroupItem value="inativa">Inativas</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    const formContent = (
        isAuthLoading ? <Skeleton className="h-96 w-full" /> : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="contabancaria-form">
                    <fieldset disabled={isEditing ? !canEdit : !canCreate} className="space-y-4 disabled:opacity-70 disabled:pointer-events-none">
                        <FormField name="nomeConta" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome da Conta</FormLabel><FormControl><Input placeholder="Ex: Conta Principal, Caixa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="tipo" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl><SelectContent><SelectGroup><SelectItem value="Conta Corrente">Conta Corrente</SelectItem><SelectItem value="Conta Poupança">Conta Poupança</SelectItem><SelectItem value="Caixa">Caixa</SelectItem></SelectGroup></SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField name="banco" control={form.control} render={({ field }) => (<FormItem><FormLabel>Banco</FormLabel><FormControl><Combobox options={bancosOptions} value={field.value ?? ""} onChange={field.onChange} placeholder="Selecione o banco..."/></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="agencia" control={form.control} render={({ field }) => (<FormItem><FormLabel>Agência</FormLabel><FormControl><Input placeholder="Ex: 0001-2" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField name="conta" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta</FormLabel><FormControl><Input placeholder="Ex: 12345-6" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField name="saldoInicial" control={form.control} render={({ field }) => (<FormItem><FormLabel>Saldo Inicial</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} disabled={isEditing} /></FormControl><FormMessage /></FormItem>)} />
                    </fieldset>
                    <div className="flex justify-end gap-2 pt-4">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="contabancaria-form" disabled={isEditing ? !canEdit : !canCreate}>{isEditing ? "Salvar Alterações" : "Adicionar Conta"}</Button>
                    </div>
                </form>
            </Form>
        )
    );

    return (
        <PermissionGuard modulo="financeiro">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativa' ? 'Inativação' : 'Reativação'}`}
                description={`Tem certeza que deseja ${actionToConfirm?.status === 'inativa' ? 'inativar' : 'reativar'} esta conta bancária?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Conta" : "Nova Conta Bancária"}
                formContent={formContent}
                tableTitle="Contas Cadastradas"
                tableContent={(
                    <GenericTable
                        columns={columns}
                        data={contasBancarias}
                        filterPlaceholder="Buscar por nome da conta..."
                        filterColumnId="nomeConta"
                        renderSubComponent={renderSubComponent}
                        tableControlsComponent={tableControlsComponent}
                    />
                )}
            />
        </PermissionGuard>
    );
}
