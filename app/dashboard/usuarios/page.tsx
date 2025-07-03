"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconRefresh } from "@tabler/icons-react";
import { Unsubscribe } from "firebase/firestore";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DetailsSubRow } from "@/components/details-sub-row";
import { createUserInAuth } from "@/lib/services/auth.services";
import { setUserDoc, setUserStatus, subscribeToUsersByStatus } from "@/lib/services/user.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { SystemUser, userSchema, Role } from "@/lib/schemas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Combobox } from "@/components/ui/combobox";

const formSchema = userSchema.pick({
    displayName: true,
    email: true,
    roleId: true,
    password: true
});

type UserFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";
type UserWithRole = SystemUser & { role?: Role };

export default function UsuariosPage() {
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const { user: currentUser } = useAuthStore();
    const { roles } = useDataStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ativo");

    const form = useForm<UserFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { displayName: "", email: "", roleId: "", password: "" },
    });

    const roleOptions = useMemo(() => roles.map(r => ({ label: r.nome, value: r.id! })), [roles]);

    useEffect(() => {
        const unsubscribe: Unsubscribe = subscribeToUsersByStatus(statusFiltro, (fetchedUsers) => {
            const usersWithRoles = fetchedUsers.map(u => ({
                ...u,
                role: roles.find(r => r.id === u.roleId)
            }));
            setUsers(usersWithRoles);
        });
        return () => unsubscribe();
    }, [statusFiltro, roles]);


    const handleEdit = (user: UserWithRole) => {
        setEditingUid(user.uid);
        setIsEditing(true);
        form.reset({
            displayName: user.displayName,
            email: user.email,
            roleId: user.roleId,
            password: "",
        });
    };

    const handleStatusChange = async (uid: string, newStatus: StatusFiltro) => {
        if (uid === currentUser?.uid) {
            toast.error("Você não pode alterar o status da sua própria conta.");
            return;
        }
        const action = newStatus === 'inativo' ? 'inativar' : 'reativar';
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

        try {
            await setUserStatus(uid, newStatus);
            toast.success(`Usuário ${action} com sucesso!`);
        } catch (error: any) {
            toast.error(`Erro ao ${action} o usuário.`, { description: error.message });
        }
    };

    const resetForm = () => {
        form.reset({ displayName: "", email: "", roleId: "", password: "" });
        setIsEditing(false);
        setEditingUid(null);
    };

    const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
        const toastId = toast.loading("Salvando usuário...");
        try {
            if (isEditing && editingUid) {
                await setUserDoc({ uid: editingUid, displayName: values.displayName, email: values.email, roleId: values.roleId });
                toast.success("Usuário atualizado com sucesso!", { id: toastId });
            } else {
                if (!values.password || values.password.length < 6) {
                    form.setError("password", { message: "A senha é obrigatória." });
                    return toast.error("Senha inválida.", { id: toastId });
                }
                const uid = await createUserInAuth(values.email, values.password);
                await setUserDoc({ uid, displayName: values.displayName, email: values.email, roleId: values.roleId, status: "ativo" });
                toast.success("Usuário criado com sucesso!", { id: toastId });
            }
            resetForm();
        } catch (error: any) {
            toast.error("Ocorreu um erro", { id: toastId, description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<UserWithRole> }) => (
        <DetailsSubRow details={[{ label: "UID do Usuário", value: row.original.uid, className: "col-span-full" }]} />
    ), []);

    const columns: ColumnDef<UserWithRole>[] = [
        { accessorKey: "displayName", header: "Nome" },
        { accessorKey: "email", header: "E-mail" },
        { accessorKey: "role.nome", header: "Função", cell: ({ row }) => <Badge variant="secondary">{row.original.role?.nome || 'Não definida'}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => {
                const isMyOwnAccount = row.original.uid === currentUser?.uid;
                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><IconPencil className="h-4 w-4" /></Button>
                        {statusFiltro === 'ativo' ? (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusChange(row.original.uid, 'inativo')} disabled={isMyOwnAccount}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusChange(row.original.uid, 'ativo')}>
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value) => value && setStatusFiltro(value as StatusFiltro)}>
                <ToggleGroupItem value="ativo">Ativos</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativos</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Usuário" : "Novo Usuário do Sistema"}
            formContent={(
                <GenericForm schema={formSchema} onSubmit={onSubmit} formId="user-form" form={form}>
                    <div className="space-y-4">
                        <FormField name="displayName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome de Exibição</FormLabel><FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem> )}/>
                        {!isEditing && ( <FormField name="password" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem> )}/> )}
                        <FormField name="roleId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Função no Sistema</FormLabel><Combobox options={roleOptions} value={field.value} onChange={field.onChange} placeholder="Selecione a função" searchPlaceholder="Buscar função..." /><FormMessage /></FormItem>)}/>
                    </div>
                    <div className="flex justify-end gap-2 pt-6">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="user-form" disabled={form.formState.isSubmitting}>{isEditing ? "Salvar Alterações" : "Criar Usuário"}</Button>
                    </div>
                </GenericForm>
            )}
            tableTitle="Usuários Cadastrados"
            tableContent={(
                <GenericTable
                    columns={columns}
                    data={users}
                    filterPlaceholder="Filtrar por nome..."
                    filterColumnId="displayName"
                    renderSubComponent={renderSubComponent}
                    tableControlsComponent={tableControlsComponent}
                />
            )}
        />
    );
}
