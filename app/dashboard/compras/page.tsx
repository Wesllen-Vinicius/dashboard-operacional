"use client"

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, useFieldArray, useWatch, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconAlertTriangle, IconArchive, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { format } from "date-fns";
import { ColumnDef, Row } from "@tanstack/react-table";

import { CrudLayout } from "@/components/crud-layout";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { GenericTable } from "@/components/generic-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { Compra, compraSchema } from "@/lib/schemas";
import { registrarCompra, subscribeToComprasByStatus, setCompraStatus } from "@/lib/services/compras.services";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type CompraFormValues = z.infer<typeof compraSchema>;
type CompraComDetalhes = Compra & { fornecedorNome: string };
type StatusFiltro = "ativo" | "inativo";

const defaultFormValues: CompraFormValues = {
    fornecedorId: "", notaFiscal: "", data: new Date(), itens: [],
    condicaoPagamento: "A_VISTA", contaBancariaId: "", valorTotal: 0,
    numeroParcelas: 1, dataPrimeiroVencimento: new Date(), status: "ativo",
};

export default function ComprasPage() {
    const { canCreate, canInactivate } = usePermissions('compras');
    const { produtos, fornecedores, contasBancarias } = useDataStore();
    const { user } = useAuthStore();

    const [compras, setCompras] = useState<Compra[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativo');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string, status: StatusFiltro } | null>(null);

    const form = useForm<CompraFormValues>({
        resolver: zodResolver(compraSchema),
        defaultValues: defaultFormValues,
    });

    // CORREÇÃO: useFieldArray é um hook e deve ser chamado separadamente.
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });

    const watchedItens = useWatch({ control: form.control, name: 'itens' });
    const watchedCondicao = useWatch({ control: form.control, name: 'condicaoPagamento' });
    const watchedTotal = form.watch('valorTotal');

    useEffect(() => {
        const unsubscribe = subscribeToComprasByStatus(statusFiltro, setCompras);
        return () => unsubscribe();
    }, [statusFiltro]);

    const produtosComprados = useMemo(() => produtos.filter(p => p.tipoProduto === 'MATERIA_PRIMA' || p.tipoProduto === 'USO_INTERNO'), [produtos]);
    const fornecedorOptions = useMemo(() => fornecedores.map(f => ({ label: f.razaoSocial, value: f.id! })), [fornecedores]);
    const contasBancariasOptions = useMemo(() => contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })), [contasBancarias]);
    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (fornecedores.length === 0) faltantes.push({ nome: "Fornecedores", link: "/dashboard/fornecedores" });
        if (produtosComprados.length === 0) faltantes.push({ nome: "Produtos (Matéria-Prima/Uso Interno)", link: "/dashboard/produtos" });
        if (contasBancarias.length === 0) faltantes.push({ nome: "Contas Bancárias", link: "/dashboard/financeiro/contas-bancarias" });
        return faltantes;
    }, [fornecedores, produtosComprados, contasBancarias]);

    const comprasEnriquecidas = useMemo(() => {
        return compras.map(c => ({ ...c, fornecedorNome: fornecedores.find(f => f.id === c.fornecedorId)?.razaoSocial || "N/A" }))
    }, [compras, fornecedores])

    useEffect(() => {
        const total = watchedItens.reduce((acc, item) => acc + ((item.quantidade || 0) * (item.custoUnitario || 0)), 0);
        form.setValue('valorTotal', total);
    }, [watchedItens, form]);

    const resetForm = () => { form.reset(defaultFormValues); remove(); }

    const onSubmit: SubmitHandler<CompraFormValues> = async (values) => {
       if (!user) return toast.error("Usuário não autenticado.");
       try {
            await registrarCompra(values, user);
            toast.success("Compra registrada com sucesso!");
            resetForm();
       } catch (error: any) {
           toast.error("Falha ao registrar compra", { description: error.message });
       }
    };

    const handleStatusAction = (id: string, newStatus: StatusFiltro) => {
        setActionToConfirm({ id, status: newStatus });
        setIsConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!actionToConfirm) return;
        const { id, status } = actionToConfirm;
        const actionText = status === 'inativo' ? 'cancelar' : 'reativar';
        try {
            await setCompraStatus(id, status);
            toast.success(`Compra ${actionText === 'cancelar' ? 'cancelada' : 'reativada'} com sucesso!`);
        } catch {
            toast.error(`Erro ao ${actionText} a compra.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const handleItemChange = (index: number, produtoId: string) => {
        const produto = produtosComprados.find(p => p.id === produtoId);
        if(produto){ form.setValue(`itens.${index}.produtoNome`, produto.nome); }
    }

    const renderSubComponent = useCallback(({ row }: { row: Row<CompraComDetalhes> }) => (
        <div className="p-4 bg-muted/20">
            <h4 className="font-semibold text-sm mb-2">Itens da Compra (NF: {row.original.notaFiscal})</h4>
            <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Custo Un.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>{row.original.itens.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell>{item.produtoNome}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {item.custoUnitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(item.quantidade * item.custoUnitario).toFixed(2)}</TableCell>
                    </TableRow>
                ))}</TableBody>
            </Table>
        </div>
    ), []);

    const columns: ColumnDef<CompraComDetalhes>[] = [
        { header: "Data", cell: ({row}) => format(row.original.data as Date, 'dd/MM/yyyy') },
        { header: "Fornecedor", accessorKey: "fornecedorNome" },
        { header: "NF", accessorKey: "notaFiscal" },
        { header: "Itens", cell: ({row}) => <div className="text-center">{row.original.itens.length}</div> },
        { header: "Valor Total", cell: ({row}) => `R$ ${row.original.valorTotal.toFixed(2)}`},
        { header: "Pagamento", cell: ({row}) => <Badge variant={row.original.condicaoPagamento === 'A_VISTA' ? "default" : "secondary"}>{row.original.condicaoPagamento.replace('_', ' ')}</Badge>},
        {
            id: "actions", cell: ({ row }) => (
                <div className="text-right">
                    {statusFiltro === 'ativo'
                        ? <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusAction(row.original.id!, 'inativo')} disabled={!canInactivate}><IconArchive className="h-4 w-4" /></Button>
                        : <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusAction(row.original.id!, 'ativo')} disabled={!canInactivate}><IconRefresh className="h-4 w-4" /></Button>
                    }
                </div>
            )
        }
    ];

    const formContent = (
         dependenciasFaltantes.length > 0 ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisitos necessário</AlertTitle>
                <AlertDescription>Para registrar uma compra, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (<li key={dep.nome}><Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button></li>))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
            <Form {...form}>
                <fieldset disabled={!canCreate} className="space-y-6 disabled:opacity-70 disabled:pointer-events-none">
                    <form onSubmit={form.handleSubmit(onSubmit)} id="compra-form">
                        <div className="space-y-4">
                            <FormField name="fornecedorId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Fornecedor</FormLabel><Combobox options={fornecedorOptions} {...field} placeholder="Selecione um fornecedor" searchPlaceholder="Buscar fornecedor..."/><FormMessage /></FormItem>)} />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField name="notaFiscal" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nº da Nota Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="data" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data da Compra</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <FormLabel>Itens da Compra</FormLabel>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                                    <FormField name={`itens.${index}.produtoId`} control={form.control} render={({ field: formField }) => (<FormItem><Select onValueChange={(value) => {formField.onChange(value); handleItemChange(index, value);}} value={formField.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto/Item" /></SelectTrigger></FormControl><SelectContent>{produtosComprados.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                    <FormField name={`itens.${index}.quantidade`} control={form.control} render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField name={`itens.${index}.custoUnitario`} control={form.control} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" placeholder="Custo" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}/>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, custoUnitario: 0, produtoNome: "" })}><IconPlus className="mr-2 h-4 w-4" /> Adicionar Item</Button>
                        </div>
                        <Separator />
                        <h3 className="text-lg font-medium">Detalhes do Pagamento</h3>
                        <div className="grid md:grid-cols-2 gap-4 items-start">
                            <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Condição</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="A_VISTA">À Vista</SelectItem><SelectItem value="A_PRAZO">A Prazo/Parcelado</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField name="contaBancariaId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta de Origem (Débito)</FormLabel><Combobox options={contasBancariasOptions} {...field} placeholder="Selecione a conta..." searchPlaceholder="Buscar conta..."/><FormMessage /></FormItem>)} />
                        </div>
                        {watchedCondicao === 'A_PRAZO' && (
                            <div className="grid md:grid-cols-2 gap-4 items-start p-4 border bg-muted/50 rounded-lg">
                                <FormField name="numeroParcelas" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nº de Parcelas</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="dataPrimeiroVencimento" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>1º Vencimento</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>)} />
                            </div>
                        )}
                        <div className="text-right pt-4 border-t"><p className="text-sm text-muted-foreground">Valor Total da Compra</p><p className="text-2xl font-bold">R$ {watchedTotal.toFixed(2).replace('.', ',')}</p></div>
                        <div className="flex justify-end pt-8"><Button type="submit" form="compra-form" size="lg">Registrar Compra</Button></div>
                    </form>
                </fieldset>
            </Form>
        )
    );

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="ativo">Ativas</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Canceladas</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <PermissionGuard modulo="compras">
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativo' ? 'Cancelamento' : 'Reativação'}`}
                description="Esta ação não reverte as movimentações de estoque ou financeiras associadas a esta compra."
            />
            <CrudLayout
                formTitle="Registrar Nova Compra"
                formContent={formContent}
                tableTitle="Histórico de Compras"
                tableContent={<GenericTable columns={columns} data={comprasEnriquecidas} filterPlaceholder="Filtrar por fornecedor..." filterColumnId="fornecedorNome" renderSubComponent={renderSubComponent} tableControlsComponent={tableControlsComponent} />}
            />
        </PermissionGuard>
    );
}
