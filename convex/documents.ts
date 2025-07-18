import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByIds = query({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, { ids }) => {
    const documents = [];

    for (const id of ids) {
      const document = await ctx.db.get(id);

      if (document) {
        documents.push({ id: document._id, name: document.title });
      } else {
        documents.push({ id, name: "Documento não encontrado" });
      }
    }

    return documents;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    return await ctx.db.insert("documents", {
      title: args.title ?? "Sem título",
      ownerId: user.subject,
      organizationId,
      initialContent: args.initialContent,
    });
  },
});

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, search }) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    // Busca com uma organização
    if (search && organizationId) {
      return await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("organizationId", organizationId)
        )
        .paginate(paginationOpts);
    }

    // Busca sem uma organização
    if (search) {
      return await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", user.subject)
        )
        .paginate(paginationOpts);
    }

    // Sem busca com uma organização
    if (organizationId) {
      return await ctx.db
        .query("documents")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", organizationId)
        )
        .paginate(paginationOpts);
    }

    // Sem busca e sem uma organização
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user.subject))
      .paginate(paginationOpts);
  },
});

export const removeById = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const document = await ctx.db.get(args.id);

    if (!document) throw new ConvexError("Documento não encontrado!");

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Only owners and organization members can delete documents
    // Shared users cannot delete documents
    if (!isOwner && !isOrganizationMember)
      throw new ConvexError(
        "Você não tem permissão para remover este documento!"
      );

    return await ctx.db.delete(args.id);
  },
});

export const updateById = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const document = await ctx.db.get(args.id);

    if (!document) throw new ConvexError("Documento não encontrado!");

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Check if user has shared editor access
    const sharedPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", args.id).eq("userId", user.subject)
      )
      .first();

    const hasEditorAccess = sharedPermission?.role === "editor";

    if (!isOwner && !isOrganizationMember && !hasEditorAccess)
      throw new ConvexError(
        "Você não tem permissão para editar este documento!"
      );

    return await ctx.db.patch(args.id, { title: args.title });
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const document = await ctx.db.get(id);

    if (!document) throw new ConvexError("Documento não encontrado!");
    
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      // Allow unauthenticated access for now, but in production
      // you might want to throw an error here
      return document;
    }

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Check if user has shared access
    const sharedPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", id).eq("userId", user.subject)
      )
      .first();

    const hasSharedAccess = !!sharedPermission;

    if (!isOwner && !isOrganizationMember && !hasSharedAccess) {
      throw new ConvexError("Você não tem permissão para acessar este documento!");
    }
    
    return document;
  },
});
