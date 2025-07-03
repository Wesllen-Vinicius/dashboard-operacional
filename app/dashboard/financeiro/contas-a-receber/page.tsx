"use client"

import { useEffect, useState, useMemo, useCallback } from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/use-permissions";
import { subscribeToContasAReceber, receberPagamento } from "@/lib/services/contasAReceber.services";
import { ContaAReceber } from "@/lib/schemas";
import { PermissionGuard } from "@/components/permission-guard";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DetailsSubRow } from "@/components/details-sub-row";

type ContaComNome = ContaAReceber & { clienteNome?: string };

export default function ContasAReceberPage() {
    const { canEdit } = usePermissions('financeiro');
    const [contas, setContas] = useState<ContaAReceber[]>([]);
    const { clientes, contasBancarias } = useDataStore();
    const { user } = useAuthStore();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedConta, setSelectedConta] = useState<ContaAReceber | null>(null);
    const [selectedContaBancaria, setSelectedContaBancaria] = useState<string>("");

    useEffect(() => {
        const unsubContas = subscribeToContasAReceber(setContas);
        return () => unsubContas();
    }, []);

    const handleOpenDialog = (conta: ContaAReceber) => {
        setSelectedConta(conta);
        setIsDialogOpen(true);
    };

    const handleConfirmRecebimento = async () => {
        if (!selectedConta || !selectedContaBancaria || !user) {
            toast.error("Selecione uma conta bancária e certifique-se de estar logado.");
            return;
        }

        try {
            await receberPagamento(selectedConta, selectedContaBancaria, user);
            toast.success("Conta recebida e baixada com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao processar recebimento.", { description: error.message });
        } finally {
            setIsDialogOpen(false);
            setSelectedConta(null);
            setSelectedContaBancaria("");
        }
    };

    const contasComCliente = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            clienteNome: clientes.find(c => c.id === conta.clienteId)?.nome || "N/A"
        }));
    }, [contas, clientes]);

    const renderSubComponent = useCallback(({ row }: { row: Row<ContaComNome> }) => {
        const conta = row.original;
        const details = [
            { label: "Data de Emissão", value: format(new Date(conta.dataEmissao), 'dd/MM/yyyy') },
            { label: "Venda de Origem", value: <Button asChild variant="link" size="sm" className="p-0 h-auto"><Link href={`/dashboard/vendas?vendaId=${conta.vendaId}`}>Ver Venda</Link></Button> },
            { label: "ID da Conta", value: conta.id, className: "col-span-1 sm:col-span-2" },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<ContaComNome>[] = [
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Vencimento", accessorKey: "dataVencimento", cell: ({ row }) => row.original.dataVencimento ? format(row.original.dataVencimento, 'dd/MM/yyyy') : 'N/A' },
        { header: "Valor", accessorKey: "valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", accessorKey: "status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && canEdit && (
                    <Button size="sm" onClick={() => handleOpenDialog(row.original)}>Dar Baixa (Receber)</Button>
                )}
            </div>
        )}
    ];

    return (
        <PermissionGuard modulo="financeiro">
            <div className="container mx-auto py-8 px-4 md:px-6">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar Recebimento</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                             <p>Confirme a baixa para a conta no valor de <span className="font-semibold text-lg">R$ {selectedConta?.valor.toFixed(2)}</span>.</p>
                             <div className="space-y-2">
                                <Label htmlFor="conta-bancaria">Selecione a conta de destino do recebimento</Label>
                                 <Select onValueChange={setSelectedContaBancaria} value={selectedContaBancaria}>
                                    <SelectTrigger id="conta-bancaria">
                                        <SelectValue placeholder="Selecione a conta..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contasBancarias.map(conta => (
                                            <SelectItem key={conta.id} value={conta.id!}>{`${conta.nomeConta} (Saldo: R$ ${conta.saldoAtual?.toFixed(2)})`}</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                             </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                            <Button type="button" onClick={handleConfirmRecebimento} disabled={!selectedContaBancaria}>Confirmar Recebimento</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardHeader>
                        <CardTitle>Contas a Receber</CardTitle>
                        <CardDescription>Visualize e gerencie as contas de vendas a prazo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GenericTable
                            columns={columns}
                            data={contasComCliente}
                            filterPlaceholder="Pesquisar por cliente..."
                            filterColumnId="clienteNome"
                            renderSubComponent={renderSubComponent}
                        />
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    );
}
