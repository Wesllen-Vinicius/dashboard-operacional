"use client"

import { useState, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { ColumnDef } from "@tanstack/react-table";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { DateRangePicker } from "@/components/date-range-picker";
import { Combobox } from "@/components/ui/combobox";
import { GenericTable } from "@/components/generic-table";
import { useDataStore } from "@/store/data.store";
import { getMovimentacoesPorContaEPeriodo, MovimentacaoBancaria } from "@/lib/services/fluxoCaixa.services";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";

const filterSchema = z.object({
    contaId: z.string().min(1, "Selecione uma conta."),
    periodo: z.object({
        from: z.date({ required_error: "A data de início é obrigatória." }),
        to: z.date({ required_error: "A data de fim é obrigatória." }),
    }).refine(data => data.from && data.to, { message: "Selecione um período válido." }),
});

type FilterFormValues = z.infer<typeof filterSchema>;

export default function FluxoCaixaPage() {
    const { canRead } = usePermissions('financeiro');
    const { contasBancarias } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [movimentacoes, setMovimentacoes] = useState<MovimentacaoBancaria[]>([]);
    const [saldoInicialPeriodo, setSaldoInicialPeriodo] = useState<number | null>(null);

    const form = useForm<FilterFormValues>({
        resolver: zodResolver(filterSchema),
        defaultValues: { contaId: "" }
    });

    const contasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })),
    [contasBancarias]);

    const onSubmit: SubmitHandler<FilterFormValues> = async (values) => {
        setIsLoading(true);
        setMovimentacoes([]);
        setSaldoInicialPeriodo(null);
        try {
            const data = await getMovimentacoesPorContaEPeriodo(values.contaId, values.periodo.from, values.periodo.to);
            setMovimentacoes(data);

            if (data.length > 0) {
                setSaldoInicialPeriodo(data[0].saldoAnterior);
            } else {
                const contaSelecionada = contasBancarias.find(c => c.id === values.contaId);
                if (contaSelecionada) {
                    setSaldoInicialPeriodo(contaSelecionada.saldoAtual || 0);
                }
                toast.info("Nenhuma movimentação encontrada para esta conta no período selecionado.");
            }
        } catch (error: any) {
            toast.error("Erro ao buscar extrato.", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const columns: ColumnDef<MovimentacaoBancaria>[] = [
        { header: "Data", cell: ({ row }) => format(new Date(row.original.data), 'dd/MM/yyyy HH:mm') },
        { header: "Descrição", accessorKey: "motivo" },
        {
            header: "Valor",
            cell: ({ row }) => (
                <span className={row.original.tipo === 'credito' ? 'text-green-600' : 'text-destructive'}>
                   {row.original.tipo === 'credito' ? '+' : '-'} R$ {row.original.valor.toFixed(2)}
                </span>
            )
        },
        { header: "Saldo", cell: ({ row }) => `R$ ${row.original.saldoNovo.toFixed(2)}` },
    ];

    const saldoFinalPeriodo = movimentacoes.length > 0 ? movimentacoes[movimentacoes.length - 1].saldoNovo : saldoInicialPeriodo;

    return (
        <PermissionGuard modulo="financeiro">
            <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Fluxo de Caixa / Extrato Bancário</CardTitle>
                        <CardDescription>Selecione a conta e o período para visualizar as movimentações detalhadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-end gap-4">
                                <FormField
                                    name="contaId"
                                    control={form.control}
                                    render={({ field }) => (
                                    <FormItem className="w-full sm:w-auto flex-1">
                                        <FormLabel>Conta Bancária</FormLabel>
                                        <Combobox options={contasOptions} {...field} placeholder="Selecione uma conta" searchPlaceholder="Buscar conta..."/>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    name="periodo"
                                    control={form.control}
                                    render={({ field }) => (
                                    <FormItem className="w-full sm:w-auto">
                                        <FormLabel>Período</FormLabel>
                                        <DateRangePicker date={field.value as DateRange | undefined} onDateChange={field.onChange} />
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isLoading || !canRead} className="w-full sm:w-auto">
                                    {isLoading ? "Buscando..." : "Gerar Extrato"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {(movimentacoes.length > 0 || saldoInicialPeriodo !== null) && (
                     <Card>
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                 <CardTitle>Extrato do Período</CardTitle>
                                 <CardDescription>
                                     Conta: {contasOptions.find(c => c.value === form.getValues('contaId'))?.label}
                                 </CardDescription>
                            </div>
                            <div className="flex gap-4 sm:gap-8 text-right">
                                 <div>
                                    <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                                    <p className="font-bold text-lg">R$ {saldoInicialPeriodo?.toFixed(2)}</p>
                                 </div>
                                 <div>
                                    <p className="text-sm text-muted-foreground">Saldo Final</p>
                                    <p className="font-bold text-lg text-primary">R$ {saldoFinalPeriodo?.toFixed(2)}</p>
                                 </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <GenericTable columns={columns} data={movimentacoes} />
                        </CardContent>
                     </Card>
                )}
            </div>
        </PermissionGuard>
    );
}
