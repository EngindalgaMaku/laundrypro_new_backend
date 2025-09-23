import { NextRequest, NextResponse } from "next/server";

import { getPlanForBusiness } from "@/lib/entitlements";



import { prisma } from "@/lib/db";
// Archive invoices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, invoiceIds, archiveAll = false, dateRange } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Plan gate
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura arşivleme için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    let invoicesToArchive;

    if (archiveAll) {
      // Archive all eligible invoices for the business
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Archive invoices older than 6 months

      invoicesToArchive = await prisma.eInvoice.findMany({
        where: {
          businessId,
          gibStatus: { in: ["ACCEPTED", "CANCELLED", "REJECTED"] },
          createdAt: { lt: cutoffDate },
        },
      });
    } else if (dateRange) {
      // Archive invoices within date range
      const { startDate, endDate } = dateRange;
      invoicesToArchive = await prisma.eInvoice.findMany({
        where: {
          businessId,
          gibStatus: { in: ["ACCEPTED", "CANCELLED", "REJECTED"] },
          invoiceDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });
    } else if (invoiceIds && Array.isArray(invoiceIds)) {
      // Archive specific invoices
      invoicesToArchive = await prisma.eInvoice.findMany({
        where: {
          id: { in: invoiceIds },
          businessId,
          gibStatus: { in: ["ACCEPTED", "CANCELLED", "REJECTED"] },
        },
      });
    } else {
      return NextResponse.json(
        {
          error:
            "Either invoiceIds, archiveAll=true, or dateRange must be provided",
        },
        { status: 400 }
      );
    }

    if (invoicesToArchive.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No invoices found to archive",
        archived: 0,
      });
    }

    const results = [];
    const errors = [];

    // Process each invoice
    for (const invoice of invoicesToArchive) {
      try {
        // Update invoice status to ARCHIVED
        const archivedInvoice = await prisma.eInvoice.update({
          where: { id: invoice.id },
          data: {
            gibStatus: "ARCHIVED",
            gibStatusDate: new Date(),
            updatedAt: new Date(),
          },
        });

        // Log the archival
        await prisma.eInvoiceLog.create({
          data: {
            eInvoiceId: invoice.id,
            action: "ARCHIVE",
            status: "SUCCESS",
            requestData: JSON.stringify({
              invoiceNumber: invoice.invoiceNumber,
              archiveDate: new Date(),
            }),
            responseData: JSON.stringify({
              previousStatus: invoice.gibStatus,
              newStatus: "ARCHIVED",
            }),
          },
        });

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
        });
      } catch (error: any) {
        console.error(`Error archiving invoice ${invoice.id}:`, error);
        errors.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        });
      }
    }

    // Update business archive settings
    await prisma.eInvoiceSettings.update({
      where: { businessId },
      data: {
        lastArchiveDate: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: invoicesToArchive.length,
        archived: results.length,
        failed: errors.length,
      },
      message: `Successfully archived ${results.length} invoices`,
    });
  } catch (error: any) {
    console.error("Invoice archival error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }}

// Get archive statistics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 }
    );
  }

  try {
    // Plan gate
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura arşiv istatistikleri için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // Get archive statistics
    const [
      totalInvoices,
      archivedInvoices,
      eligibleForArchive,
      archiveSettings,
    ] = await Promise.all([
      prisma.eInvoice.count({
        where: { businessId },
      }),
      prisma.eInvoice.count({
        where: {
          businessId,
          gibStatus: "ARCHIVED",
        },
      }),
      prisma.eInvoice.count({
        where: {
          businessId,
          gibStatus: { in: ["ACCEPTED", "CANCELLED", "REJECTED"] },
          createdAt: {
            lt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
          },
        },
      }),
      prisma.eInvoiceSettings.findUnique({
        where: { businessId },
        select: {
          archiveRetentionYears: true,
          lastArchiveDate: true,
        },
      }),
    ]);

    // Get monthly archive summary
    const monthlyArchives = await prisma.eInvoice.groupBy({
      by: ["gibStatusDate"],
      where: {
        businessId,
        gibStatus: "ARCHIVED",
        gibStatusDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        },
      },
      _count: {
        id: true,
      },
    });

    // Process monthly data
    const monthlyData = monthlyArchives.reduce(
      (acc: Record<string, number>, item) => {
        if (item.gibStatusDate) {
          const month = item.gibStatusDate.toISOString().substring(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + item._count.id;
        }
        return acc;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      statistics: {
        total: totalInvoices,
        archived: archivedInvoices,
        eligibleForArchive,
        archiveRate:
          totalInvoices > 0
            ? Math.round((archivedInvoices / totalInvoices) * 100)
            : 0,
      },
      settings: archiveSettings,
      monthlyData,
    });
  } catch (error: any) {
    console.error("Archive statistics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}

// Restore archived invoices
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, invoiceIds } = body;

    if (!businessId || !invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json(
        { error: "Business ID and invoice IDs array are required" },
        { status: 400 }
      );
    }

    // Plan gate
    const plan = await getPlanForBusiness(businessId);
    if (plan !== "PRO") {
      return NextResponse.json(
        { error: "E-Fatura arşivden geri alma için PRO plan gereklidir" },
        { status: 402 }
      );
    }

    // Get archived invoices
    const invoicesToRestore = await prisma.eInvoice.findMany({
      where: {
        id: { in: invoiceIds },
        businessId,
        gibStatus: "ARCHIVED",
      },
    });

    if (invoicesToRestore.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No archived invoices found to restore",
        restored: 0,
      });
    }

    const results = [];
    const errors = [];

    // Restore each invoice
    for (const invoice of invoicesToRestore) {
      try {
        // Determine the previous status (we'll use ACCEPTED as default)
        let previousStatus = "ACCEPTED";

        // Try to get the previous status from logs
        const lastLog = await prisma.eInvoiceLog.findFirst({
          where: {
            eInvoiceId: invoice.id,
            action: { not: "ARCHIVE" },
          },
          orderBy: { createdAt: "desc" },
        });

        if (lastLog?.responseData) {
          try {
            const logData = JSON.parse(lastLog.responseData);
            if (logData.status) {
              previousStatus = logData.status;
            }
          } catch {
            // Keep default status
          }
        }

        // Update invoice status
        const restoredInvoice = await prisma.eInvoice.update({
          where: { id: invoice.id },
          data: {
            gibStatus: previousStatus as any,
            gibStatusDate: new Date(),
            updatedAt: new Date(),
          },
        });

        // Log the restoration
        await prisma.eInvoiceLog.create({
          data: {
            eInvoiceId: invoice.id,
            action: "RESTORE",
            status: "SUCCESS",
            requestData: JSON.stringify({
              invoiceNumber: invoice.invoiceNumber,
              restoreDate: new Date(),
            }),
            responseData: JSON.stringify({
              previousStatus: "ARCHIVED",
              newStatus: previousStatus,
            }),
          },
        });

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          restoredStatus: previousStatus,
          success: true,
        });
      } catch (error: any) {
        console.error(`Error restoring invoice ${invoice.id}:`, error);
        errors.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: invoicesToRestore.length,
        restored: results.length,
        failed: errors.length,
      },
      message: `Successfully restored ${results.length} invoices`,
    });
  } catch (error: any) {
    console.error("Invoice restoration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }}
