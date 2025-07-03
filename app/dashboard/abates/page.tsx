"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPencil, IconAlertTriangle, IconArchive, IconRefresh } from "@tabler/icons-react";
import { Timestamp, Unsubscribe } from "firebase/firestore";
import { DateRange } from "react-day-picker";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/date-range-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DetailsSubRow } from "@/components/details-sub-row";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Abate, abateSchema } from "@/lib/schemas";
import { addAbate, updateAbate, setAbateStatus, subscribeToAbatesByStatusAndDateRange } from "@/lib/services/abates.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";

// CORREÇÃO: Schema explícito para o formulário para evitar o erro de tipo do Zod.
const formSchema = z.object({
    data: z.date({ required_error: "A data é obrigatória." }),
    total: z.coerce.number().positive("O total de animais deve ser maior que zero."),
    condenado: z.coerce.number().min(0, "A quantidade de condenados não pode ser negativa."),
    responsavelId: z.string().min(1, "O responsável pelo abate é obrigatório."),
    compraId: z.string().min(1, "É obrigatório vincular o abate a uma compra."),
});

type AbateFormValues = z.infer<typeof formSchema>;
type AbateComDetalhes = Abate & { responsavelNome?: string; registradorNome?: string; };
type StatusFiltro = "ativo" | "inativo";

export default function AbatesPage() {
    const { canCreate, canEdit, canInactivate } = usePermissions('abates');
    const { funcionarios, compras } = useDataStore();
    const { user } = useAuthStore();

    const [abates, setAbates] = useState<Abate[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string; status: StatusFiltro } | null>(null);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativo');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const form = useForm<AbateFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { data: new Date(), total: 0, condenado: 0, responsavelId: "", compraId: "" }
    });

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!funcionarios || funcionarios.length === 0) {
            faltantes.push({ nome: "Prestadores", link: "/dashboard/funcionarios" });
        }
        if (!compras || compras.length === 0) {
            faltantes.push({ nome: "Compras de Matéria-Prima", link: "/dashboard/compras" });
        }
        return faltantes;
    }, [funcionarios, compras]);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe: Unsubscribe = subscribeToAbatesByStatusAndDateRange(statusFiltro, dateRange, (data) => {
            setAbates(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [dateRange, statusFiltro]);

    const funcionarioOptions = useMemo(() =>
        funcionarios.map(f => ({ label: f.nomeCompleto, value: f.id! })),
    [funcionarios]);

    const compraOptions = useMemo(() =>
        compras
            .filter(c => c.id && c.status === 'ativo')
            .map(c => ({
                label: `NF: ${c.notaFiscal} - Data: ${format(c.data as Date, "dd/MM/yyyy")}`,
                value: c.id!
            })),
    [compras]);

    const abatesEnriquecidos: AbateComDetalhes[] = useMemo(() => {
        return abates.map(abate => ({
            ...abate,
            responsavelNome: funcionarios.find(f => f.id === abate.responsavelId)?.nomeCompleto || 'N/A',
            registradorNome: abate.registradoPor.nome || 'N/A',
        }));
    }, [abates, funcionarios]);

    const handleEdit = (abate: AbateComDetalhes) => {
        setEditingId(abate.id!);
        setIsEditing(true);
        form.reset({
            data: abate.data,
            total: abate.total,
            condenado: abate.condenado,
            responsavelId: abate.responsavelId,
            compraId: abate.compraId,
        });
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
            await setAbateStatus(id, status);
            toast.success(`Registro de abate ${actionText === 'inativar' ? 'inativado' : 'reativado'} com sucesso!`);
        } catch {
            toast.error(`Erro ao ${actionText} o registro.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const resetForm = () => {
        form.reset({ data: new Date(), total: 0, condenado: 0, responsavelId: "", compraId: "" });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit: SubmitHandler<AbateFormValues> = async (values) => {
        if (!user) return toast.error("Usuário não autenticado.");

        try {
            if (isEditing && editingId) {
                await updateAbate(editingId, values);
                toast.success("Registro de abate atualizado com sucesso!");
            } else {
                await addAbate(values, user);
                toast.success("Novo abate registrado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Falha ao salvar registro.", { description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<AbateComDetalhes> }) => {
        const abate = row.original;
        const compraRef = compras.find(c => c.id === abate.compraId);

        const details = [
            { label: "Responsável pelo Abate", value: abate.responsavelNome },
            { label: "Registrado Por", value: abate.registradorNome },
            { label: "Referência da Compra", value: compraRef ? `NF ${compraRef.notaFiscal}` : 'N/A' },
            { label: "Data do Registro", value: abate.createdAt ? format((abate.createdAt as Timestamp).toDate(), 'dd/MM/yyyy HH:mm') : 'N/A' },
        ];
        return <DetailsSubRow details={details} />;
    }, [compras]);

    const columns: ColumnDef<AbateComDetalhes>[] = [
        { accessorKey: "data", header: "Data", cell: ({ row }) => format(row.original.data as Date, "dd/MM/yyyy") },
        { accessorKey: "total", header: "Total" },
        { accessorKey: "condenado", header: "Condenado" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!canEdit}><IconPencil className="h-4 w-4" /></Button>
                        {statusFiltro === 'ativo' ?
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusAction(item.id!, 'inativo')} disabled={!canInactivate}><IconArchive className="h-4 w-4" /></Button>
                            : <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusAction(item.id!, 'ativo')} disabled={!canInactivate}><IconRefresh className="h-4 w-4" /></Button>
                        }
                    </div>
                );
            }
        },
    ];

    const formContent = (
        dependenciasFaltantes.length > 0 && !isEditing ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                <AlertDescription>
                    Para registrar um abate, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (<li key={dep.nome}><Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button></li>))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
            <fieldset disabled={isEditing ? !canEdit : !canCreate} className="space-y-4 disabled:opacity-70 disabled:pointer-events-none">
                <GenericForm schema={formSchema} onSubmit={onSubmit} formId="abate-form" form={form}>
                    <div className="space-y-4">
                        <FormField name="compraId" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Vincular Compra de Origem</FormLabel><Combobox options={compraOptions} value={field.value} onChange={field.onChange} placeholder="Selecione uma compra..." searchPlaceholder="Buscar por NF ou data..." /><FormMessage /></FormItem>)} />
                        <FormField name="data" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data do Abate</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="total" control={form.control} render={({ field }) => (<FormItem><FormLabel>Abate Total (cabeças)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField name="condenado" control={form.control} render={({ field }) => (<FormItem><FormLabel>Condenado (cabeças)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField name="responsavelId" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Responsável pelo abate</FormLabel><Combobox options={funcionarioOptions} value={field.value} onChange={field.onChange} placeholder="Selecione um responsável" searchPlaceholder="Buscar responsável..." /><FormMessage /></FormItem>)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-6">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="abate-form">{isEditing ? "Salvar" : "Registrar"}</Button>
                    </div>
                </GenericForm>
            </fieldset>
        )
    );

    const tableControlsComponent = (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <div className="flex-grow flex justify-end">
                <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                    <ToggleGroupItem value="ativo">Ativos</ToggleGroupItem>
                    <ToggleGroupItem value="inativo">Inativos</ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );

    return (
        <PermissionGuard modulo="abates">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativo' ? 'Inativação' : 'Reativação'}`}
                description={`Tem certeza que deseja ${actionToConfirm?.status === 'inativo' ? 'inativar' : 'reativar'} este registro de abate?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Registro de Abate" : "Novo Registro"}
                formContent={formContent}
                tableTitle="Histórico de Abates"
                tableContent={
                    isLoading ? (
                        <div className="space-y-2">
                            <div className="flex flex-col md:flex-row gap-4"><Skeleton className="h-10 w-full md:w-sm" /><Skeleton className="h-10 w-[300px]" /></div>
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <GenericTable
                            columns={columns}
                            data={abatesEnriquecidos}
                            filterPlaceholder="Pesquisar por responsável..."
                            filterColumnId="responsavelNome"
                            tableControlsComponent={tableControlsComponent}
                            renderSubComponent={renderSubComponent}
                        />
                    )
                }
            />
        </PermissionGuard>
    );
}
