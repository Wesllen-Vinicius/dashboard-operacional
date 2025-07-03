"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil} from "@tabler/icons-react";
import { format } from "date-fns";
import { z } from "zod";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { DespesaOperacional, despesaOperacionalSchema } from "@/lib/schemas";
import { addDespesa, updateDespesa, subscribeToDespesasByStatus, setDespesaStatus } from "@/lib/services/despesas.services";
import { useDataStore } from "@/store/data.store";
import { DetailsSubRow } from "@/components/details-sub-row";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/hooks/use-permissions";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

const formSchema = despesaOperacionalSchema.pick({
    descricao: true, valor: true, dataVencimento: true, categoria: true, contaBancariaId: true, status: true,
});

type DespesaFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "Pendente" | "Paga";

export default function DespesasPage() {
    const { canCreate, canEdit } = usePermissions('financeiro');
    const { contasBancarias } = useDataStore();
    const [despesas, setDespesas] = useState<DespesaOperacional[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('Pendente');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string; status: 'Paga' } | null>(null);

    const form = useForm<DespesaFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { descricao: "", valor: 0, dataVencimento: new Date(), categoria: "", contaBancariaId: "", status: 'Pendente' },
    });

    useEffect(() => {
        const unsubscribe = subscribeToDespesasByStatus(statusFiltro, setDespesas);
        return () => unsubscribe();
    }, [statusFiltro]);

    const contasBancariasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })),
    [contasBancarias]);

    const handleEdit = (despesa: DespesaOperacional) => {
        setIsEditing(true);
        setEditingId(despesa.id!);
        form.reset({ ...despesa, dataVencimento: new Date(despesa.dataVencimento) });
    };

    const handleMarkAsPaid = (id: string) => {
        setActionToConfirm({ id, status: 'Paga' });
        setIsConfirmOpen(true);
    };

    const confirmPayment = async () => {
        if(!actionToConfirm) return;
        try {
            await setDespesaStatus(actionToConfirm.id, 'Paga');
            toast.success("Despesa marcada como paga!");
        } catch {
            toast.error("Erro ao atualizar o status da despesa.");
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const resetForm = () => {
        form.reset({ descricao: "", valor: 0, dataVencimento: new Date(), categoria: "", contaBancariaId: "", status: 'Pendente' });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit: SubmitHandler<DespesaFormValues> = async (values) => {
        try {
            if (isEditing && editingId) {
                await updateDespesa(editingId, values);
                toast.success("Despesa atualizada com sucesso!");
            } else {
                await addDespesa(values);
                toast.success("Despesa cadastrada com sucesso!");
            }
            resetForm();
        } catch (e: any) {
            toast.error("Ocorreu um erro ao salvar a despesa.", { description: e.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<DespesaOperacional> }) => {
        const conta = contasBancarias.find(c => c.id === row.original.contaBancariaId);
        const details = [ { label: "Categoria", value: row.original.categoria }, { label: "Conta para Débito", value: conta?.nomeConta || 'N/A' } ];
        return <DetailsSubRow details={details} />;
    }, [contasBancarias]);

    const columns: ColumnDef<DespesaOperacional>[] = [
        { accessorKey: "descricao", header: "Descrição" },
        { accessorKey: "valor", header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}` },
        { accessorKey: "dataVencimento", header: "Vencimento", cell: ({ row }) => format(new Date(row.original.dataVencimento), 'dd/MM/yyyy') },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>{row.original.status}</Badge> },
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && canEdit && (
                    <Button variant="link" size="sm" onClick={() => handleMarkAsPaid(row.original.id!)}>Marcar como Paga</Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!canEdit}><IconPencil className="h-4 w-4" /></Button>
            </div>
        )}
    ];

    const formContent = (
        <fieldset disabled={isEditing ? !canEdit : !canCreate} className="disabled:opacity-70 disabled:pointer-events-none">
            <GenericForm schema={formSchema} onSubmit={onSubmit} formId="despesa-form" form={form}>
                <div className="space-y-4">
                    <FormField name="descricao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Descrição da Despesa</FormLabel><FormControl><Input placeholder="Ex: Aluguel do Galpão" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="categoria" control={form.control} render={({ field }) => (<FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Custo Fixo, Impostos" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField name="valor" control={form.control} render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="dataVencimento" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="contaBancariaId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta para Débito (Opcional)</FormLabel><Combobox options={contasBancariasOptions} {...field} placeholder="Selecione a conta de origem" searchPlaceholder="Buscar conta..."/><FormMessage /></FormItem>)} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="despesa-form">{isEditing ? "Salvar Alterações" : "Adicionar Despesa"}</Button>
                </div>
            </GenericForm>
        </fieldset>
    );

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="Pendente">Pendentes</ToggleGroupItem>
                <ToggleGroupItem value="Paga">Pagas</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <PermissionGuard modulo="financeiro">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmPayment}
                title="Confirmar Pagamento"
                description="Tem certeza que deseja marcar esta despesa como paga? Esta ação não pode ser desfeita."
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Despesa" : "Nova Despesa Operacional"}
                formContent={formContent}
                tableTitle="Despesas Cadastradas"
                tableContent={(
                    <GenericTable
                        columns={columns}
                        data={despesas}
                        filterPlaceholder="Filtrar por descrição..."
                        filterColumnId="descricao"
                        renderSubComponent={renderSubComponent}
                        tableControlsComponent={tableControlsComponent}
                    />
                )}
            />
        </PermissionGuard>
    );
}
