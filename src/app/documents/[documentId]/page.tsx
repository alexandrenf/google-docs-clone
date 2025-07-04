import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Document } from "./document";

interface DocumentIdPageProps {
  params: Promise<{ documentId: Id<"documents"> }>;
}

export default async function DocumentIdPage({ params }: DocumentIdPageProps) {
  const { documentId } = await params;

  const { getToken } = await auth();
  const token = (await getToken({ template: "convex" })) ?? undefined;

  // Debug logging for JWT token
  console.log("JWT Token Debug:");
  console.log("Token exists:", !!token);
  console.log("Token length:", token?.length);
  
  if (token) {
    try {
      // Decode the JWT token to see its structure (don't log sensitive data in production)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      console.log("JWT Payload:", payload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
    }
  }

  if (!token) throw new Error("Não autorizado!");

  const preloadedDocument = await preloadQuery(
    api.documents.getById,
    { id: documentId },
    { token }
  );

  return <Document preloadedDocument={preloadedDocument} />;
}
