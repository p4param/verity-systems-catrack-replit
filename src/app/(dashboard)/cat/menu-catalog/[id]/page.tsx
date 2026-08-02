'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Utensils } from 'lucide-react';

import { MenuCatalogItemDetail } from '@/modules/cat/menu-catalog/domain/menu-catalog-types';
import { MenuCatalogWorkspaceKey } from '@/modules/cat/menu-catalog/domain/menu-catalog-workspace-types';
import { MenuCatalogWorkspaceNavigator } from '@/modules/cat/menu-catalog/components/MenuCatalogWorkspaceNavigator';
import { MenuCatalogOverviewWorkspace } from '@/modules/cat/menu-catalog/components/MenuCatalogOverviewWorkspace';
import { MenuCatalogRecipesWorkspace } from '@/modules/cat/menu-catalog/components/MenuCatalogRecipesWorkspace';

// EM-WP05 — Menu Catalog Workspace, extended by EM-WP06 — Recipe
// Management. Two tabs: Overview (identity/classification/dietary/
// service/description/image/status) and Recipes (Recipe Variants).
export default function MenuCatalogWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<MenuCatalogItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<MenuCatalogWorkspaceKey>('OVERVIEW');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/menu-catalog/${id}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.item);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load Menu Catalog Workspace:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Menu Catalog Workspace...</div>;
  }

  if (notFound || !item) {
    return (
      <div className="p-10 text-center space-y-2">
        <Utensils className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Menu Catalog item not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/menu-catalog')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Menu Catalog</span>
      </button>

      {/* Catalog Item Header */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{item.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.category && <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{item.category}</span>}
          {item.cuisine && <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{item.cuisine}</span>}
        </div>
      </div>

      {/* Workspace Navigator */}
      <MenuCatalogWorkspaceNavigator activeWorkspace={activeWorkspace} onSelect={setActiveWorkspace} />

      {/* Current Workspace */}
      {activeWorkspace === 'OVERVIEW' ? (
        <MenuCatalogOverviewWorkspace item={item} onSaved={setItem} />
      ) : activeWorkspace === 'RECIPES' ? (
        <MenuCatalogRecipesWorkspace catalogItemId={item.id} />
      ) : null}
    </div>
  );
}
