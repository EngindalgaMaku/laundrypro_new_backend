import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, JWTPayload } from "@/lib/auth";
import { PermissionService, PermissionContext } from "./PermissionService";

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * RBAC Middleware for protecting API routes with permission checks
 */
export function withRBAC(
  permissions: string | string[],
  options?: {
    requireAll?: boolean; // If true, user must have ALL permissions (default: false - any permission)
    resourceId?: (request: NextRequest) => string | undefined; // Dynamic resource ID extraction
    metadata?: (request: NextRequest) => Record<string, any>; // Additional context
  }
) {
  return function rbacMiddleware(
    handler: (
      request: AuthenticatedRequest,
      context?: any
    ) => Promise<NextResponse>
  ) {
    return async function (
      request: AuthenticatedRequest,
      context?: any
    ): Promise<NextResponse> {
      try {
        // 1. Authenticate user
        const user = getUserFromRequest(request);
        if (!user) {
          return NextResponse.json(
            { error: "Authentication required", code: "AUTH_REQUIRED" },
            { status: 401 }
          );
        }

        // Add user to request object
        request.user = user;

        // 2. Build permission context
        const permissionContext: PermissionContext = {
          userId: user.userId,
          businessId: user.businessId,
          resourceId: options?.resourceId
            ? options.resourceId(request)
            : undefined,
          metadata: {
            ipAddress:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
            ...(options?.metadata ? options.metadata(request) : {}),
          },
        };

        // 3. Check permissions
        const requiredPermissions = Array.isArray(permissions)
          ? permissions
          : [permissions];
        const permissionChecks = await PermissionService.hasPermissions(
          requiredPermissions,
          permissionContext
        );

        // 4. Evaluate permission results
        const grantedPermissions = Object.entries(permissionChecks)
          .filter(([_, check]) => check.granted)
          .map(([perm]) => perm);

        const requireAll = options?.requireAll || false;
        const hasRequiredPermissions = requireAll
          ? requiredPermissions.every((perm) =>
              grantedPermissions.includes(perm)
            )
          : grantedPermissions.length > 0;

        if (!hasRequiredPermissions) {
          // Find the first denied permission for error message
          const deniedPermission = requiredPermissions.find(
            (perm) => !grantedPermissions.includes(perm)
          );
          const deniedCheck =
            permissionChecks[deniedPermission || requiredPermissions[0]];

          return NextResponse.json(
            {
              error: "Insufficient permissions",
              code: "PERMISSION_DENIED",
              required: requiredPermissions,
              granted: grantedPermissions,
              reason: deniedCheck?.reason || "Permission denied",
            },
            { status: 403 }
          );
        }

        // 5. Add permission context to request for use in handler
        (request as any).permissionContext = permissionContext;
        (request as any).grantedPermissions = grantedPermissions;

        // 6. Call the original handler
        return await handler(request, context);
      } catch (error) {
        console.error("RBAC Middleware error:", error);
        return NextResponse.json(
          { error: "Permission check failed", code: "RBAC_ERROR" },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Simple authentication middleware (no permission checks)
 */
export function withAuth(
  handler: (
    request: AuthenticatedRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return async function (
    request: AuthenticatedRequest,
    context?: any
  ): Promise<NextResponse> {
    try {
      const user = getUserFromRequest(request);
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }

      request.user = user;
      return await handler(request, context);
    } catch (error) {
      console.error("Auth Middleware error:", error);
      return NextResponse.json(
        { error: "Authentication failed", code: "AUTH_ERROR" },
        { status: 500 }
      );
    }
  };
}

/**
 * Business context middleware - ensures user belongs to the business
 */
export function withBusinessContext(
  handler: (
    request: AuthenticatedRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest, context?: any) => {
    const user = request.user!;

    if (!user.businessId) {
      return NextResponse.json(
        {
          error: "Business association required",
          code: "NO_BUSINESS_CONTEXT",
        },
        { status: 400 }
      );
    }

    return await handler(request, context);
  });
}

/**
 * Role-based middleware - check if user has specific role
 */
export function withRole(
  allowedRoles: string | string[],
  handler: (
    request: AuthenticatedRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest, context?: any) => {
    const user = request.user!;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(user.role)) {
      return NextResponse.json(
        {
          error: "Insufficient role permissions",
          code: "ROLE_DENIED",
          required: roles,
          current: user.role,
        },
        { status: 403 }
      );
    }

    return await handler(request, context);
  });
}

/**
 * Owner-only middleware - restricts access to business owners
 */
export function withOwnerOnly(
  handler: (
    request: AuthenticatedRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return withRole("OWNER", handler);
}

/**
 * Manager or above middleware - restricts access to managers and owners
 */
export function withManagerOrAbove(
  handler: (
    request: AuthenticatedRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return withRole(["OWNER", "MANAGER"], handler);
}

/**
 * Helper function to extract resource ID from URL parameters
 */
export function extractResourceId(paramName: string = "id") {
  return (request: NextRequest): string | undefined => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    // Find the parameter by looking for it after 'api' in the path
    // e.g., /api/users/123 would extract 123 if paramName is 'id'
    const apiIndex = pathParts.indexOf("api");
    if (apiIndex !== -1 && pathParts.length > apiIndex + 2) {
      // For routes like /api/users/[id], extract the ID
      if (paramName === "id") {
        return pathParts[pathParts.length - 1];
      }
    }

    return undefined;
  };
}

/**
 * Helper function to extract metadata from request
 */
export function extractMetadata(
  extractors: Record<string, (req: NextRequest) => any>
) {
  return (request: NextRequest): Record<string, any> => {
    const metadata: Record<string, any> = {};

    Object.entries(extractors).forEach(([key, extractor]) => {
      try {
        metadata[key] = extractor(request);
      } catch (error) {
        console.error(`Error extracting metadata for ${key}:`, error);
        metadata[key] = null;
      }
    });

    return metadata;
  };
}

/**
 * Utility functions for common permission patterns
 */
export const PermissionPatterns = {
  // User management permissions
  userManagement: [
    "users:create",
    "users:read",
    "users:update",
    "users:delete",
  ],
  userRead: ["users:read"],
  userWrite: ["users:create", "users:update"],

  // Customer management permissions
  customerManagement: [
    "customers:create",
    "customers:read",
    "customers:update",
    "customers:delete",
  ],
  customerRead: ["customers:read"],
  customerWrite: ["customers:create", "customers:update"],

  // Order management permissions
  orderManagement: [
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:delete",
    "orders:assign",
  ],
  orderRead: ["orders:read"],
  orderWrite: ["orders:create", "orders:update"],
  orderAssign: ["orders:assign"],

  // Invoice management permissions
  invoiceManagement: [
    "invoices:create",
    "invoices:read",
    "invoices:update",
    "invoices:delete",
    "invoices:send",
  ],
  invoiceRead: ["invoices:read"],
  invoiceWrite: ["invoices:create", "invoices:update"],
  invoiceSend: ["invoices:send"],

  // Business management permissions
  businessManagement: ["business:read", "business:update", "business:manage"],
  businessRead: ["business:read"],
  businessSettings: ["business:manage"],

  // System settings and reports
  systemSettings: ["settings:read", "settings:update"],
  reports: ["reports:read", "reports:financial"],
};

/**
 * Pre-configured middleware functions for common use cases
 */
export const RBACMiddleware = {
  // User management
  requireUserRead: withRBAC(PermissionPatterns.userRead),
  requireUserWrite: withRBAC(PermissionPatterns.userWrite),
  requireUserManagement: withRBAC(PermissionPatterns.userManagement, {
    requireAll: false,
  }),

  // Customer management
  requireCustomerRead: withRBAC(PermissionPatterns.customerRead),
  requireCustomerWrite: withRBAC(PermissionPatterns.customerWrite),
  requireCustomerManagement: withRBAC(PermissionPatterns.customerManagement, {
    requireAll: false,
  }),

  // Order management
  requireOrderRead: withRBAC(PermissionPatterns.orderRead),
  requireOrderWrite: withRBAC(PermissionPatterns.orderWrite),
  requireOrderManagement: withRBAC(PermissionPatterns.orderManagement, {
    requireAll: false,
  }),

  // Invoice management
  requireInvoiceRead: withRBAC(PermissionPatterns.invoiceRead),
  requireInvoiceWrite: withRBAC(PermissionPatterns.invoiceWrite),
  requireInvoiceManagement: withRBAC(PermissionPatterns.invoiceManagement, {
    requireAll: false,
  }),

  // Business management
  requireBusinessRead: withRBAC(PermissionPatterns.businessRead),
  requireBusinessManagement: withRBAC(PermissionPatterns.businessManagement, {
    requireAll: false,
  }),

  // System access
  requireSystemSettings: withRBAC(PermissionPatterns.systemSettings),
  requireReports: withRBAC(PermissionPatterns.reports),
};
