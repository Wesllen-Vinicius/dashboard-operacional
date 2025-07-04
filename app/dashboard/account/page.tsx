"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { CenteredLayout } from "@/components/centered-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateUserProfile, uploadProfileImage, changeUserPassword } from "@/lib/services/user.services";
import { useState, useEffect, ChangeEvent, forwardRef } from "react";
import React from "react";

const profileSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  photoFile: z.instanceof(FileList).optional(),
});

const passwordSchema = z.object({
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

// Componente intermediário para remover a prop 'value' do input de arquivo
const FileInput = forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, 'value'>>((props, ref) => {
    return <Input {...props} ref={ref} />;
});
FileInput.displayName = "FileInput";


export default function AccountPage() {
    const { user, role } = useAuthStore(); // Adicionado 'role'
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: { displayName: "" },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    useEffect(() => {
        if(user) {
            profileForm.reset({ displayName: user.displayName || "" });
            setPhotoPreview(user.photoURL ?? null);
        }
    }, [user, profileForm]);

    const handleProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        setIsSavingProfile(true);

        try {
            let newPhotoURL: string | null = user.photoURL;

            if (values.photoFile && values.photoFile.length > 0) {
                newPhotoURL = await uploadProfileImage(values.photoFile[0], user.uid);
            }

            await updateUserProfile(values.displayName, newPhotoURL);
            toast.success("Perfil atualizado com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao atualizar perfil.", { description: error.message });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        setIsSavingPassword(true);
        try {
            await changeUserPassword(values.newPassword);
            toast.success("Senha alterada com sucesso!");
            passwordForm.reset();
        } catch (error: any) {
            toast.error("Erro ao alterar senha.", { description: "Pode ser necessário fazer logout e login novamente para realizar esta operação." });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const photoFile = profileForm.watch("photoFile");
    React.useEffect(() => {
        if (photoFile && photoFile.length > 0) {
            const newPreviewUrl = URL.createObjectURL(photoFile[0]);
            setPhotoPreview(newPreviewUrl);

            return () => URL.revokeObjectURL(newPreviewUrl);
        }
    }, [photoFile]);


    if (!user) return null;

    return (
        <CenteredLayout>
            <div className="space-y-8">
                {/* NOVO CARD DE INFORMAÇÕES DO USUÁRIO PARA TESTE */}
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle>Informações de Autenticação (Teste)</CardTitle>
                        <CardDescription>
                            Dados recuperados do sistema para o seu usuário. Verifique se a sua <strong>Função</strong> está correta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold">Função (Role)</p>
                            <Badge variant={role === 'ADMINISTRADOR' ? 'default' : 'secondary'}>
                                {role || "Não definida"}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Email</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                         <div>
                            <p className="text-sm font-semibold">Nome de Exibição</p>
                            <p className="text-sm text-muted-foreground">{user.displayName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">UID do Usuário</p>
                            <p className="text-sm text-muted-foreground break-all">{user.uid}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Meu Perfil</CardTitle>
                        <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GenericForm schema={profileSchema} onSubmit={handleProfileSubmit} formId="profile-form" form={profileForm}>
                            <div className="flex items-center gap-4 mb-6">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={photoPreview ?? undefined} />
                                    <AvatarFallback className="text-2xl">{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <FormField
                                    name="photoFile"
                                    control={profileForm.control}
                                    render={({ field: { onChange, onBlur, name, ref }}) => (
                                    <FormItem>
                                        <FormLabel>Nova Foto de Perfil</FormLabel>
                                        <FormControl>
                                            <FileInput
                                                type="file"
                                                accept="image/*"
                                                onBlur={onBlur}
                                                name={name}
                                                ref={ref}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField name="displayName" control={profileForm.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome de Exibição</FormLabel>
                                    <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" form="profile-form" className="w-full mt-6" disabled={isSavingProfile}>
                                {isSavingProfile ? "Salvando..." : "Salvar Perfil"}
                            </Button>
                        </GenericForm>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Alterar Senha</CardTitle>
                        <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GenericForm schema={passwordSchema} onSubmit={handlePasswordSubmit} formId="password-form" form={passwordForm}>
                             <div className="space-y-4">
                                <FormField name="newPassword" control={passwordForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova Senha</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="confirmPassword" control={passwordForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Nova Senha</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <Button type="submit" form="password-form" className="w-full mt-6" disabled={isSavingPassword}>
                                {isSavingPassword ? "Alterando..." : "Alterar Senha"}
                            </Button>
                        </GenericForm>
                    </CardContent>
                </Card>
            </div>
        </CenteredLayout>
    );
}
