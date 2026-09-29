import { IntegracoesTab } from "./IntegracoesTab";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Lock, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";

// ======================== SCHEMAS ZOD ========================
const tenantSchema = z.object({
  razaoSocial: z.string().min(3, "RazÃ£o Social deve ter no mÃ­nimo 3 caracteres"),
  nomeFantasia: z.string().min(2, "Nome Fantasia obrigatÃ³rio"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/, "CNPJ invÃ¡lido (Ex: 12.345.678/0001-99)"),
  inscricaoEstadual: z.string().optional(),
});

const userSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "Nome completo Ã© obrigatÃ³rio"),
  email: z.string().email("E-mail invÃ¡lido"),
  role: z.enum(["ADMIN", "GERENTE", "CONFERENTE", "FINANCEIRO"]),
  senhaTemporaria: z.string().optional(),
});

// ======================== API REAIS ========================
const fetchEmpresa = async () => {
  try {
    const { data } = await api.get('/empresa');
    return data;
  } catch (error) {
    return { razaoSocial: "", nomeFantasia: "", cnpj: "", inscricaoEstadual: "" };
  }
};

const fetchUsuarios = async () => {
  try {
    const { data } = await api.get('/usuarios');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

// ======================== COMPONENTE PRINCIPAL ========================
export default function Configuracoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Queries
  const { data: empresa, isLoading: loadEmpresa } = useQuery({ queryKey: ['empresa'], queryFn: fetchEmpresa });
  const { data: usuarios, isLoading: loadUsuarios } = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios });

  // Forms
  const tenantForm = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { razaoSocial: "", nomeFantasia: "", cnpj: "", inscricaoEstadual: "" },
  });

  useEffect(() => {
    if (empresa) {
      tenantForm.reset({
        razaoSocial: empresa.razaoSocial || "",
        nomeFantasia: empresa.nomeFantasia || "",
        cnpj: empresa.cnpj || "",
        inscricaoEstadual: empresa.inscricaoEstadual || ""
      });
    }
  }, [empresa, tenantForm]);

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "CONFERENTE", nome: "", email: "", senhaTemporaria: "" }
  });

  // Mutations
  const mutationEmpresa = useMutation({
    mutationFn: async (data: z.infer<typeof tenantSchema>) => {
      const response = await api.put('/empresa', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['empresa'], data);
      toast({ title: "Sucesso", description: "Dados da empresa atualizados com sucesso." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "NÃ£o foi possÃ­vel salvar os dados da empresa." });
    }
  });

  const mutationUsuario = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      if (editingUserId) {
        const response = await api.put(`/usuarios/${editingUserId}`, data);
        return response.data;
      }
      const response = await api.post('/usuarios', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setIsUserModalOpen(false);
      userForm.reset();
      setEditingUserId(null);
      toast({ title: "Sucesso", description: "Dados do usuÃ¡rio salvos com sucesso." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar usuÃ¡rio." });
    }
  });

  const mutationDeleteUsuario = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/usuarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: "Removido", description: "O usuÃ¡rio foi excluÃ­do." });
    }
  });

  const handleEditUser = (u: any) => {
    setEditingUserId(u.id);
    userForm.reset({
      nome: u.nome,
      email: u.email,
      role: u.role || 'CONFERENTE',
      senhaTemporaria: ''
    });
    setIsUserModalOpen(true);
  };

  const handleNewUser = () => {
    setEditingUserId(null);
    userForm.reset({ role: "CONFERENTE", nome: "", email: "", senhaTemporaria: "" });
    setIsUserModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ConfiguraÃ§Ãµes</h1>
        <p className="text-muted-foreground">Gerencie as preferÃªncias da sua conta, usuÃ¡rios e integraÃ§Ãµes (RBAC Admin/Gerente).</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="bg-background border w-full justify-start h-auto p-1 flex-wrap">
          <TabsTrigger value="empresa" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 px-6">
            Empresa
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 px-6">
            UsuÃ¡rios e PermissÃµes
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 px-6">
            IntegraÃ§Ãµes ERP
          </TabsTrigger>
        </TabsList>
        
        {/* ===================== ABA EMPRESA ===================== */}
        <TabsContent value="empresa" className="space-y-4 animate-in fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Tenant</CardTitle>
              <CardDescription>Atualize as informaÃ§Ãµes da sua conta corporativa.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadEmpresa ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : (
                <form onSubmit={tenantForm.handleSubmit((d) => mutationEmpresa.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>RazÃ£o Social</Label>
                      <Input {...tenantForm.register("razaoSocial")} />
                      {tenantForm.formState.errors.razaoSocial && <span className="text-xs text-rose-500">{tenantForm.formState.errors.razaoSocial.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input {...tenantForm.register("nomeFantasia")} />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input {...tenantForm.register("cnpj")} placeholder="12.345.678/0001-99" />
                      {tenantForm.formState.errors.cnpj && <span className="text-xs text-rose-500">{tenantForm.formState.errors.cnpj.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>InscriÃ§Ã£o Estadual</Label>
                      <Input {...tenantForm.register("inscricaoEstadual")} />
                    </div>
                  </div>
                  <Button type="submit" disabled={mutationEmpresa.isPending}>
                    {mutationEmpresa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar AlteraÃ§Ãµes
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== ABA USUÃRIOS ===================== */}
        <TabsContent value="usuarios" className="animate-in fade-in">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>GestÃ£o de UsuÃ¡rios</CardTitle>
                <CardDescription>Gerencie operadores e permissÃµes de acesso com dados reais do banco.</CardDescription>
              </div>
              <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewUser}><Plus className="mr-2 h-4 w-4" /> Novo UsuÃ¡rio</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUserId ? 'Editar UsuÃ¡rio' : 'Adicionar Novo UsuÃ¡rio'}</DialogTitle>
                    <DialogDescription>
                      {editingUserId ? 'Modifique os dados ou redefina a senha.' : 'O novo usuÃ¡rio receberÃ¡ as instruÃ§Ãµes por e-mail.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={userForm.handleSubmit((d) => mutationUsuario.mutate(d))} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input {...userForm.register("nome")} />
                      {userForm.formState.errors.nome && <span className="text-xs text-rose-500">{userForm.formState.errors.nome.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" {...userForm.register("email")} />
                      {userForm.formState.errors.email && <span className="text-xs text-rose-500">{userForm.formState.errors.email.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>NÃ­vel de Acesso (Role)</Label>
                      <Select 
                        onValueChange={(val) => userForm.setValue("role", val as any)}
                        value={userForm.watch("role")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um papel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="GERENTE">Gerente</SelectItem>
                          <SelectItem value="CONFERENTE">Conferente</SelectItem>
                          <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{editingUserId ? 'Nova Senha (opcional)' : 'Senha TemporÃ¡ria'}</Label>
                      <Input type="password" {...userForm.register("senhaTemporaria")} />
                      {userForm.formState.errors.senhaTemporaria && <span className="text-xs text-rose-500">{userForm.formState.errors.senhaTemporaria.message}</span>}
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={mutationUsuario.isPending}>
                        {mutationUsuario.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingUserId ? 'Salvar' : 'Cadastrar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadUsuarios ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : usuarios && usuarios.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left">Nome</th>
                        <th className="p-3 text-left">E-mail</th>
                        <th className="p-3 text-left">Role</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-right">AÃ§Ãµes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u: any) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-medium">{u.nome}</td>
                          <td className="p-3 text-muted-foreground">{u.email}</td>
                          <td className="p-3">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                              {u.role?.nome || u.role || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={u.ativo || u.status === 'ATIVO' ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                              {u.ativo || u.status === 'ATIVO' ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditUser(u)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if(confirm('Excluir este usuÃ¡rio?')) mutationDeleteUsuario.mutate(u.id); }}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  Nenhum usuÃ¡rio retornado pela API real. 
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== ABA INTEGRAÃ‡Ã•ES ===================== */}
        <TabsContent value="integracoes" className="animate-in fade-in">
          <IntegracoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


