"use client";

import React, { useState } from "react";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { Bug, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RuntimeInspectorProps {
  manifest: RuntimeManifest;
}

export function RuntimeInspector({ manifest }: RuntimeInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Note: For a production system, this should only render if the user has Admin rights.
  // We assume that check is done at the layout/page level, or we can check permissions here.

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-black text-white hover:bg-gray-800"
          onClick={() => setIsOpen(true)}
          title="Runtime Inspector"
        >
          <Bug className="h-5 w-5" />
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-[400px] border-l bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
          <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Runtime Inspector
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-gray-950 text-green-400 text-xs font-mono">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(manifest, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
