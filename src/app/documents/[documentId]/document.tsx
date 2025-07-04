"use client";

import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";

import { api } from "../../../../convex/_generated/api";
import { Editor } from "./editor";
import { Navbar } from "./navbar";
import { Room } from "./room";
import { Toolbar } from "./toolbar";

interface DocumentProps {
  preloadedDocument: Preloaded<typeof api.documents.getById>;
}

export function Document({ preloadedDocument }: DocumentProps) {
  const document = usePreloadedQuery(preloadedDocument);
  const { userId } = useAuth();
  
  // Check user's permission for this document
  const permission = useQuery(api.documentPermissions.getUserPermission, 
    userId ? {
      documentId: document._id,
      userId: userId,
    } : "skip"
  );
  
  // Determine if user has read-only access
  const isOwner = document.ownerId === userId;
  const isReadOnly = !isOwner && permission?.role === "viewer";

  return (
    <Room>
      <div className="min-h-screen bg-[#FAFBFD]">
        <div className="flex flex-col px-4 pt-2 gap-y-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden">
          <Navbar data={document} />
          {!isReadOnly && <Toolbar />}
        </div>

        <div className={isReadOnly ? "pt-[80px] print:pt-0" : "pt-[128px] print:pt-0"}>
          <Editor initialContent={document.initialContent} isReadOnly={isReadOnly} />
        </div>
      </div>
    </Room>
  );
}
