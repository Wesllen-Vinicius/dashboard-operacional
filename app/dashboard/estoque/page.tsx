"use client"

import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconAlertTriangle, IconLock } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { Timestamp } from "firebase/firestore";
import { z } from "zod";

import { CrudLayout } from "@/components/crud-layout";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { movimentacaoSchema, Movimentacao } from "@/lib/schemas";
import { registrarMovimentacao } from "@/lib/services/estoque.services";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";


const formSchema = movimentacaoSchema.pick({
    produtoId: true,
    quantidade: true,
    tipo: true,
    motivo: true,
});

type MovimentacaoFormValues = z.infer<typeof formSchema>;
type MovimentacaoEnriquecida = Movimentacao & { produtoNome: string, dataFormatada: string, registradoPorNome: string };

export default function MovimentacoesEstoquePage() {
    const { canCreate } = usePermissions('estoque');
    const { produtos, movimentacoes } = useDataStore();
    const { user } = useAuthStore();

    const form = useForm<MovimentacaoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            produtoId: "",
            quantidade: 0,
            tipo: "entrada",
            motivo: ""
        },
    });

    const produtoOptions = useMemo(() =>
        produtos.map(p => ({
            label: `${p.nome} (Estoque: ${p.quantidade || 0})`,
            value: p.id!
        })),
    [produtos]);

    const movimentacoesEnriquecidas = useMemo((): MovimentacaoEnriquecida[] => {
        return movimentacoes.map(mov => ({
            ...mov,
            produtoNome: produtos.find(p => p.id === mov.produtoId)?.nome || 'Produto não encontrado',
            dataFormatada: mov.data ? format((mov.data as Timestamp).toDate(), 'dd/MM/yyyy HH:mm') : 'N/A',
            registradoPorNome: mov.registradoPor?.nome || 'Sistema'
        }));
    }, [movimentacoes, produtos]);

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!produtos || produtos.length === 0) {
            faltantes.push({ nome: "Produtos", link: "/dashboard/produtos" });
        }
        return faltantes;
    }, [produtos]);


    const onSubmit: SubmitHandler<MovimentacaoFormValues> = async (values) => {
        if (!user) return toast.error("Usuário não autenticado. Por favor, faça login novamente.");

        try {
            const produtoSelecionado = produtos.find(p => p.id === values.produtoId);
            if (!produtoSelecionado) throw new Error("Produto selecionado inválido.");

            const payload = {
                ...values,
                produtoNome: produtoSelecionado.nome,
            };

            await registrarMovimentacao(payload, user);

            toast.success("Movimentação de estoque registrada com sucesso!");
            form.reset();
        } catch (error: any) {
            toast.error("Falha ao registrar movimentação", { description: error.message });
        }
    };

    const columns: ColumnDef<MovimentacaoEnriquecida>[] = [
        { accessorKey: "dataFormatada", header: "Data" },
        { accessorKey: "produtoNome", header: "Produto" },
        { accessorKey: "quantidade", header: "Quantidade", cell: ({ row }) => <div className="text-center">{row.original.quantidade}</div> },
        {
            accessorKey: "tipo",
            header: "Tipo",
            cell: ({ row }) => {
                const isEntrada = row.original.tipo === 'entrada';
                return (
                    <Badge variant={isEntrada ? "default" : "destructive"}>
                        {isEntrada ? "Entrada" : "Saída"}
                    </Badge>
                );
            }
        },
        { accessorKey: "motivo", header: "Motivo" },
        { accessorKey: "registradoPorNome", header: "Registrado Por" },
    ];

    const formContent = (
        dependenciasFaltantes.length > 0 ? (
             <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                <AlertDescription>
                    Para realizar movimentações, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (
                            <li key={dep.nome}>
                                <Button variant="link" asChild className="p-0 h-auto font-bold">
                                    <Link href={dep.link}>{dep.nome}</Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
            <Form {...form}>
                 <fieldset disabled={!canCreate} className="disabled:opacity-70 disabled:pointer-events-none">
                    <form onSubmit={form.handleSubmit(onSubmit)} id="movimentacao-form" className="space-y-4">
                        <FormField name="produtoId" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Produto</FormLabel>
                                <Combobox
                                    options={produtoOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Selecione um produto"
                                    searchPlaceholder="Buscar produto..."
                                />
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="quantidade" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantidade</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="tipo" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Movimentação</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="entrada">Entrada</SelectItem>
                                            <SelectItem value="saida">Saída</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField name="motivo" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Motivo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Ajuste de inventário, perda, bonificação" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex justify-end pt-4">
                            <Button type="submit" form="movimentacao-form">
                                Registrar Movimentação
                            </Button>
                        </div>
                    </form>
                </fieldset>
                {!canCreate && (
                    <Alert variant="destructive" className="mt-6">
                        <IconLock className="h-4 w-4" />
                        <AlertTitle>Acesso Restrito</AlertTitle>
                        <AlertDescription>
                            Você não tem permissão para realizar movimentações manuais de estoque.
                        </AlertDescription>
                    </Alert>
                )}
            </Form>
        )
    );

    return (
        <PermissionGuard modulo="estoque">
            <CrudLayout
                formTitle="Ajuste Manual de Estoque"
                formContent={formContent}
                tableTitle="Histórico de Movimentações"
                tableContent={(
                    <GenericTable
                        columns={columns}
                        data={movimentacoesEnriquecidas}
                        filterPlaceholder="Filtrar por produto..."
                        filterColumnId="produtoNome"
                    />
                )}
            />
        </PermissionGuard>
    );
}
