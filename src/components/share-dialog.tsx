"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getShareableUsers } from "@/app/documents/[documentId]/actions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  Share2, 
  X, 
  UserPlus, 
  Eye, 
  Edit3, 
  Copy,
  Check
} from "lucide-react";

interface ShareDialogProps {
  documentId: Id<"documents">;
  children?: React.ReactNode;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export function ShareDialog({ documentId, children }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor">("viewer");
  const [copiedLink, setCopiedLink] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchScope, setSearchScope] = useState<'organization' | 'all'>('organization');
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Get current user from Clerk
  const { userId: currentUserId } = useAuth();

  // Fetch document permissions
  const permissions = useQuery(api.documentPermissions.getDocumentPermissions, {
    documentId,
  });
  
  // Fetch document to get owner info
  const document = useQuery(api.documents.getById, { id: documentId });

  // Fetch users when dialog opens or scope changes
  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      setLoadingPermissions(true);
      getShareableUsers(searchScope)
        .then((users) => {
          // Filter out current user and already shared users
          const sharedUserIds = permissions?.map(p => p.userId) || [];
          const filteredUsers = users.filter(user => 
            user.id !== currentUserId && 
            user.id !== document?.ownerId &&
            !sharedUserIds.includes(user.id)
          );
          setAllUsers(filteredUsers);
        })
        .catch((error) => {
          console.error("Error fetching users:", error);
          toast.error("Erro ao carregar usuários");
        })
        .finally(() => {
          setLoadingUsers(false);
          setLoadingPermissions(false);
        });
    }
  }, [open, searchScope, permissions, currentUserId, document?.ownerId]);

  // Mutations
  const shareDocument = useMutation(api.documentPermissions.share);
  const removeShare = useMutation(api.documentPermissions.removeShare);

  const handleShare = async () => {
    if (!selectedUserId.trim()) {
      toast.error("Por favor, selecione um usuário");
      return;
    }

    try {
      const user = allUsers.find(u => u.id === selectedUserId);
      
      if (!user) {
        toast.error("Usuário não encontrado");
        return;
      }

      await shareDocument({
        documentId,
        userId: selectedUserId,
        role: selectedRole,
      });

      toast.success(`Documento compartilhado com ${user.name} como ${selectedRole === "viewer" ? "visualizador" : "editor"}`);
      setSelectedUserId("");
    } catch (error) {
      console.error("Error sharing document:", error);
      toast.error("Erro ao compartilhar documento");
    }
  };

  const handleRemoveShare = async (userId: string, userName: string) => {
    try {
      await removeShare({
        documentId,
        userId,
      });
      toast.success(`Acesso removido para ${userName}`);
    } catch (error) {
      console.error("Error removing share:", error);
      toast.error("Erro ao remover acesso");
    }
  };

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/documents/${documentId}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    toast.success("Link copiado para a área de transferência");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getUserByUserId = (userId: string) => {
    // First try to find in current users list
    const user = allUsers.find((user: User) => user.id === userId);
    if (user) return user;
    
    // If not found, create a placeholder user
    // This handles cases where the user was deleted or isn't in the current search scope
    return {
      id: userId,
      name: "Usuário removido",
      avatar: "",
      color: ""
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="size-4 mr-2" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar documento</DialogTitle>
          <DialogDescription>
            Gerencie quem tem acesso ao seu documento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Link */}
          <div className="space-y-2">
            <Label>Link de compartilhamento</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/documents/${documentId}`}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyShareLink}
                className="shrink-0"
              >
                {copiedLink ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas usuários com permissão podem acessar este link
            </p>
          </div>

          {/* Search Scope Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Buscar usuários</Label>
              <p className="text-xs text-muted-foreground">
                {searchScope === 'organization' 
                  ? 'Apenas da sua organização' 
                  : 'Todos os usuários da plataforma'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="search-scope" className="text-sm">
                {searchScope === 'organization' ? 'Organização' : 'Todos'}
              </Label>
              <Switch
                id="search-scope"
                checked={searchScope === 'all'}
                onCheckedChange={(checked) => {
                  setSearchScope(checked ? 'all' : 'organization');
                  setSelectedUserId(""); // Reset selection when scope changes
                }}
              />
            </div>
          </div>

          {/* Add People */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Adicionar pessoas</Label>
              <span className="text-xs text-muted-foreground">
                {loadingUsers ? 'Carregando...' : `${allUsers.length} usuário${allUsers.length !== 1 ? 's' : ''} encontrado${allUsers.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingUsers}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingUsers ? "Carregando..." : "Selecionar usuário..."} />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Carregando usuários...
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {searchScope === 'organization' 
                        ? "Nenhum usuário disponível na organização" 
                        : "Nenhum usuário disponível"}
                    </div>
                  ) : (
                    allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={(value: "viewer" | "editor") => setSelectedRole(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="size-4" />
                      Visualizar
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit3 className="size-4" />
                      Editar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleShare}>
                <UserPlus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Current Permissions */}
          {loadingPermissions && (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">Carregando permissões...</div>
            </div>
          )}
          {!loadingPermissions && permissions && permissions.length > 0 && (
            <div className="space-y-2">
              <Label>Pessoas com acesso</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Show document owner first */}
                {document && (
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {document.ownerId === currentUserId ? "Você" : "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {document.ownerId === currentUserId ? "Você (Proprietário)" : "Proprietário"}
                        </p>
                        <Badge variant="default" className="text-xs">
                          <Edit3 className="size-3 mr-1" />
                          Proprietário
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                {permissions.map((permission) => {
                  const user = getUserByUserId(permission.userId);
                  if (!user) return null;

                  return (
                    <div
                      key={permission._id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <Badge 
                            variant={permission.role === "editor" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {permission.role === "editor" ? (
                              <>
                                <Edit3 className="size-3 mr-1" />
                                Editor
                              </>
                            ) : (
                              <>
                                <Eye className="size-3 mr-1" />
                                Visualizador
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(permission.userId, user.name)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
