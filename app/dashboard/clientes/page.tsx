"use client"

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, DefaultValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconSearch, IconLoader, IconFileDollar, IconRefresh, IconArchive } from "@tabler/icons-react";
import Link from "next/link";
import { Unsubscribe } from "firebase/firestore";
import { format } from "date-fns";
import { z } from "zod";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";
import { Cliente, clienteSchema, ContaAReceber, enderecoSchema, IndicadorIEDestinatario } from "@/lib/schemas";
import { addCliente, updateCliente, setClienteStatus, subscribeToClientesByStatus } from "@/lib/services/clientes.services";
import { useDataStore } from "@/store/data.store";
import { Separator } from "@/components/ui/separator";
import { fetchCnpjData, fetchCepData } from "@/lib/services/brasilapi.services";
import { isValidCnpj, isValidCpf } from "@/lib/validators";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailsSubRow } from "@/components/details-sub-row";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// CORREÇÃO: Schema explícito para o formulário para garantir a correta inferência de tipos.
const formSchema = z.object({
    nome: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres."),
    tipoPessoa: z.enum(["fisica", "juridica"], { required_error: "Selecione o tipo de pessoa." }),
    documento: z.string().trim().min(11, "O CPF/CNPJ é obrigatório."),
    inscricaoEstadual: z.string().trim().optional().or(z.literal("")),
    indicadorInscricaoEstadual: IndicadorIEDestinatario.default("9"),
    telefone: z.string().trim().min(10, "O telefone é obrigatório."),
    email: z.string().trim().email("O e-mail é obrigatório e deve ser válido."),
    endereco: enderecoSchema,
}).superRefine((data, ctx) => {
    if (data.tipoPessoa === 'fisica' && !isValidCpf(data.documento)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF inválido.", path: ["documento"] });
    }
    if (data.tipoPessoa === 'juridica' && !isValidCnpj(data.documento)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ inválido.", path: ["documento"] });
    }
    if (data.indicadorInscricaoEstadual === '1' && !data.inscricaoEstadual) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Inscrição Estadual é obrigatória.", path: ["inscricaoEstadual"] });
    }
});

type ClienteFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";

const defaultFormValues: DefaultValues<ClienteFormValues> = {
    nome: "", tipoPessoa: undefined, documento: "", telefone: "", email: "",
    indicadorInscricaoEstadual: "9",
    inscricaoEstadual: "",
    endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", complemento: "" }
};

export default function ClientesPage() {
    const { canCreate, canEdit, canInactivate } = usePermissions('clientes');
    const { vendas } = useDataStore();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ativo");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isContasModalOpen, setIsContasModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string, status: StatusFiltro } | null>(null);

    const form = useForm<ClienteFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur"
    });

    const { watch, setValue, getValues, reset } = form;
    const tipoPessoa = watch("tipoPessoa");
    const documento = watch("documento");
    const cep = watch("endereco.cep");

    const showCnpjSearch = useMemo(() => tipoPessoa === 'juridica' && isValidCnpj(documento), [tipoPessoa, documento]);
    const showCepSearch = useMemo(() => cep && cep.replace(/\D/g, '').length === 8, [cep]);

    useEffect(() => {
        const unsubscribe: Unsubscribe = subscribeToClientesByStatus(statusFiltro, setClientes);
        return () => unsubscribe();
    }, [statusFiltro]);

    useEffect(() => { setValue("documento", ""); }, [tipoPessoa, setValue]);

    const handleFetch = async (type: 'cnpj' | 'cep') => {
        setIsFetching(true);
        const toastId = toast.loading(`Buscando dados por ${type.toUpperCase()}...`);
        try {
            if (type === 'cnpj') {
                const cnpjValue = getValues("documento")?.replace(/\D/g, '');
                if (!cnpjValue) throw new Error("CNPJ inválido.");
                const data = await fetchCnpjData(cnpjValue);
                const currentValues = getValues();
                reset({
                    ...currentValues, nome: data.razao_social, email: data.email || '', telefone: data.ddd_telefone_1 || '',
                    endereco: { ...currentValues.endereco, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.municipio, uf: data.uf, cep: data.cep.replace(/\D/g, ''), complemento: data.complemento }
                });
            } else {
                const cepValue = getValues("endereco.cep")?.replace(/\D/g, '');
                if (!cepValue) throw new Error("CEP inválido.");
                const data = await fetchCepData(cepValue);
                setValue('endereco.logradouro', data.street);
                setValue('endereco.bairro', data.neighborhood);
                setValue('endereco.cidade', data.city);
                setValue('endereco.uf', data.state);
                document.getElementById('endereco.numero')?.focus();
            }
            toast.success("Dados preenchidos!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsFetching(false);
        }
    };

    const handleOpenContasModal = useCallback((cliente: Cliente) => { setSelectedClient(cliente); setIsContasModalOpen(true); }, []);
    const handleEdit = (cliente: Cliente) => { setEditingId(cliente.id!); reset(cliente); setIsEditing(true); };
    const resetForm = () => { reset(defaultFormValues); setIsEditing(false); setEditingId(null) };

    const handleStatusAction = (id: string, newStatus: StatusFiltro) => {
        setActionToConfirm({ id, status: newStatus });
        setIsConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!actionToConfirm) return;
        const { id, status } = actionToConfirm;
        const action = status === 'inativo' ? 'arquivar' : 'reativar';
        try {
            await setClienteStatus(id, status);
            toast.success(`Cliente ${action === 'arquivar' ? 'arquivado' : 'reativado'} com sucesso!`);
        } catch {
            toast.error(`Erro ao ${action} o cliente.`);
        } finally {
            setIsConfirmOpen(false);
            setActionToConfirm(null);
        }
    };

    const onSubmit: SubmitHandler<ClienteFormValues> = async (values) => {
        const toastId = toast.loading("Salvando cliente...");
        try {
            if (isEditing && editingId) {
                await updateCliente(editingId, values);
                toast.success(`Cliente "${values.nome}" atualizado!`, { id: toastId });
            } else {
                await addCliente(values);
                toast.success(`Cliente "${values.nome}" cadastrado!`, { id: toastId });
            }
            resetForm();
        } catch (error: any) {
            toast.error("Erro ao salvar.", { id: toastId, description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<Cliente> }) => {
        const { email, inscricaoEstadual, tipoPessoa, endereco } = row.original;
        const details = [
            { label: "Tipo de Pessoa", value: tipoPessoa === 'fisica' ? 'Física' : 'Jurídica', isBadge: true },
            { label: "E-mail", value: email },
            { label: "Inscrição Estadual", value: inscricaoEstadual || 'N/A' },
            { label: "Endereço Completo", value: `${endereco.logradouro}, ${endereco.numero}, ${endereco.bairro} - ${endereco.cidade}/${endereco.uf}`, className: "col-span-1 sm:col-span-2 md:col-span-3" },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<Cliente>[] = [
        { accessorKey: "nome", header: "Nome / Razão Social" }, { accessorKey: "documento", header: "Documento" }, { accessorKey: "telefone", header: "Telefone" },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right flex justify-end items-center space-x-1">
                    {row.original.status === 'ativo' && <Button variant="outline" size="sm" onClick={() => handleOpenContasModal(row.original)}><IconFileDollar className="h-4 w-4 mr-2" />Contas</Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!canEdit}><IconPencil className="h-4 w-4" /></Button>
                    {statusFiltro === 'ativo'
                        ? <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusAction(row.original.id!, 'inativo')} disabled={!canInactivate}><IconArchive className="h-4 w-4" /></Button>
                        : <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusAction(row.original.id!, 'ativo')} disabled={!canInactivate}><IconRefresh className="h-4 w-4" /></Button>
                    }
                </div>
            )
        },
    ];

    const ContasDoClienteModal = () => {
        const contasDoCliente = useMemo(() => {
            if (!selectedClient) return [];
            return vendas
                .filter(v => v.clienteId === selectedClient.id && v.status === 'Pendente' && v.dataVencimento)
                .map(v => ({
                    id: v.id!, vendaId: v.id!, clienteId: v.clienteId, clienteNome: selectedClient.nome,
                    valor: v.valorFinal || v.valorTotal, dataEmissao: v.data, dataVencimento: v.dataVencimento!, status: 'Pendente'
                } as ContaAReceber));
        }, [selectedClient, vendas]);

        return (
            <Dialog open={isContasModalOpen} onOpenChange={setIsContasModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contas a Receber de {selectedClient?.nome}</DialogTitle>
                        <DialogDescription>Lista de todas as contas pendentes para este cliente.</DialogDescription>
                    </DialogHeader>
                    {contasDoCliente.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>{contasDoCliente.map(conta => (<TableRow key={conta.id}><TableCell>{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</TableCell><TableCell>R$ {conta.valor.toFixed(2)}</TableCell><TableCell className="text-right"><Button asChild variant="link" size="sm"><Link href={`/dashboard/vendas?vendaId=${conta.vendaId}`}>Ver Venda</Link></Button></TableCell></TableRow>))}</TableBody>
                        </Table>
                    ) : (<p className="text-sm text-muted-foreground py-4">Nenhuma conta pendente.</p>)}
                </DialogContent>
            </Dialog>
        );
    };

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value: StatusFiltro) => value && setStatusFiltro(value)}>
                <ToggleGroupItem value="ativo">Ativos</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativos</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <PermissionGuard modulo="clientes">
            <ContasDoClienteModal />
            <ConfirmationDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${actionToConfirm?.status === 'inativo' ? 'Arquivamento' : 'Reativação'}`}
                description={`Tem certeza que deseja ${actionToConfirm?.status === 'inativo' ? 'arquivar' : 'reativar'} este cliente?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Cliente" : "Novo Cliente"}
                formContent={(
                    <fieldset disabled={isEditing ? !canEdit : !canCreate} className="disabled:opacity-70 disabled:pointer-events-none">
                        <GenericForm schema={formSchema} onSubmit={onSubmit} formId="cliente-form" form={form}>
                            {/* O conteúdo do formulário permanece o mesmo, pois já estava correto */}
                            <div className="space-y-4">
                                <FormField name="nome" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome completo ou da empresa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="tipoPessoa" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pessoa Física ou Jurídica" /></SelectTrigger></FormControl><SelectContent><SelectItem value="fisica">Pessoa Física</SelectItem><SelectItem value="juridica">Pessoa Jurídica</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField name="documento" control={form.control} render={({ field }) => (<FormItem><FormLabel>CPF / CNPJ</FormLabel><div className="flex items-center gap-2"><FormControl><MaskedInput className="w-full" mask={tipoPessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'} {...field} /></FormControl>{showCnpjSearch && (<Button type="button" size="icon" variant="outline" onClick={() => handleFetch('cnpj')} disabled={isFetching}>{isFetching ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}</Button>)}</div><FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="telefone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput mask="(00) 00000-0000" placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Separator className="my-6" />
                                <h3 className="text-lg font-medium">Dados Fiscais</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="indicadorInscricaoEstadual" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Indicador de Inscrição Estadual</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="1">Contribuinte ICMS (com IE)</SelectItem>
                                                    <SelectItem value="2">Contribuinte isento de IE</SelectItem>
                                                    <SelectItem value="9">Não Contribuinte</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Essencial para a emissão de NF-e.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="inscricaoEstadual" control={form.control} render={({ field }) => (<FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input placeholder="Obrigatório se for Contribuinte" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Separator className="my-6" />
                                <h3 className="text-lg font-medium">Endereço</h3>
                                <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
                                    <FormField name="endereco.cep" control={form.control} render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><MaskedInput mask="00000-000" placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" variant="outline" onClick={() => handleFetch('cep')} disabled={isFetching || !showCepSearch}>{isFetching ? <IconLoader className="h-4 w-4 animate-spin" /> : "Buscar Endereço"}</Button>
                                </div>
                                <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                                    <FormField name="endereco.logradouro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Av, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="endereco.numero" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="endereco.numero" placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="endereco.complemento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="endereco.bairro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="endereco.cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="endereco.uf" control={form.control} render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="flex justify-end gap-2 pt-6">
                                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                                <Button type="submit" form="cliente-form">{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
                            </div>
                        </GenericForm>
                    </fieldset>
                )}
                tableTitle="Clientes Cadastrados"
                tableContent={(<GenericTable columns={columns} data={clientes} filterPlaceholder="Filtrar por nome..." filterColumnId="nome" renderSubComponent={renderSubComponent} tableControlsComponent={tableControlsComponent} />)}
            />
        </PermissionGuard>
    );
}
