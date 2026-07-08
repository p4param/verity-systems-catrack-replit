import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { NavigationRepository } from "@/modules/platform/navigation/repositories/navigation-repository";
import { NavigationService } from "@/modules/platform/navigation/services/navigation-service";

const repository = new NavigationRepository();
const service = new NavigationService();

export async function GET(req: Request) {
  try {
    requirePermission(req, "PLATFORM_MODULE_VIEW");
    const groups = await repository.getAllGroups();
    const items = await repository.getAllItems();
    return NextResponse.json({ success: true, data: { groups, items } });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_CREATE");
    const body = await req.json();

    if (body.type === "GROUP") {
      const group = await service.createGroup(
        {
          code: body.code.trim().toUpperCase(),
          name: body.name.trim(),
          description: body.description,
          icon: body.icon,
          color: body.color,
          displayOrder: body.displayOrder,
          isVisible: body.isVisible,
          isCollapsedByDefault: body.isCollapsedByDefault,
          createdBy: String(user.sub)
        },
        user.tenantId,
        user.sub
      );
      return NextResponse.json({ success: true, data: group });
    } else {
      const item = await service.createItem(
        {
          title: body.title.trim(),
          parentId: body.parentId || undefined,
          navigationGroupId: body.navigationGroupId || undefined,
          platformModuleId: body.platformModuleId || undefined,
          entityId: body.entityId || undefined,
          route: body.route || undefined,
          icon: body.icon || undefined,
          displayOrder: body.displayOrder,
          menuType: body.menuType,
          target: body.target,
          openInNewTab: body.openInNewTab,
          visible: body.visible,
          mobileVisible: body.mobileVisible,
          customerPortalVisible: body.customerPortalVisible,
          vendorPortalVisible: body.vendorPortalVisible,
          favoriteAllowed: body.favoriteAllowed,
          searchable: body.searchable,
          metadata: body.metadata,
          createdBy: String(user.sub)
        },
        user.tenantId,
        user.sub
      );
      return NextResponse.json({ success: true, data: item });
    }
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_UPDATE");
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: { message: "id is required" } }, { status: 400 });
    }

    if (body.type === "GROUP") {
      const group = await service.updateGroup(
        id,
        {
          name: body.name,
          description: body.description,
          icon: body.icon,
          color: body.color,
          displayOrder: body.displayOrder,
          isVisible: body.isVisible,
          isCollapsedByDefault: body.isCollapsedByDefault,
          updatedBy: String(user.sub)
        },
        user.tenantId,
        user.sub
      );
      return NextResponse.json({ success: true, data: group });
    } else {
      const item = await service.updateItem(
        id,
        {
          title: body.title,
          parentId: body.parentId || null,
          navigationGroupId: body.navigationGroupId || null,
          platformModuleId: body.platformModuleId || null,
          entityId: body.entityId || null,
          route: body.route || null,
          icon: body.icon || null,
          displayOrder: body.displayOrder,
          menuType: body.menuType,
          target: body.target,
          openInNewTab: body.openInNewTab,
          visible: body.visible,
          mobileVisible: body.mobileVisible,
          customerPortalVisible: body.customerPortalVisible,
          vendorPortalVisible: body.vendorPortalVisible,
          favoriteAllowed: body.favoriteAllowed,
          searchable: body.searchable,
          metadata: body.metadata,
          updatedBy: String(user.sub)
        },
        user.tenantId,
        user.sub
      );
      return NextResponse.json({ success: true, data: item });
    }
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_DELETE");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ success: false, error: { message: "id and type are required" } }, { status: 400 });
    }

    if (type === "GROUP") {
      const deleted = await service.deleteGroup(id, user.tenantId, user.sub);
      return NextResponse.json({ success: true, data: deleted });
    } else {
      const deleted = await service.deleteItem(id, user.tenantId, user.sub);
      return NextResponse.json({ success: true, data: deleted });
    }
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
