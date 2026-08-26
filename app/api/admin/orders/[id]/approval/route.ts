import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import { sendAppEmail, appUrl } from "@/lib/email";
import { OrderApprovalEmail } from "@/emails/OrderApprovalEmail";
import { parseEnumValue } from "@/lib/enum-values";
import { approvalStatuses } from "@/lib/prisma-enums";


type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { session, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    const body = await request.json();

    const approvalStatus = parseEnumValue(
      approvalStatuses,
      typeof body.approvalStatus === "string"
        ? body.approvalStatus
        : undefined,
    );
    const approvalNote = String(body.approvalNote ?? "").trim();

    if (!approvalStatus) {
      return NextResponse.json({ error: "Invalid approval status." }, { status: 400 });
    }

    const nextOrderStatus =
      approvalStatus === "APPROVED"
        ? "ACCEPTED"
        : approvalStatus === "DENIED"
          ? "CANCELLED"
          : "PENDING";

    const decisionNote =
      approvalStatus === "APPROVED"
        ? approvalNote || "Order approved."
        : approvalStatus === "DENIED"
          ? approvalNote || "Order denied."
          : approvalNote || "Approval reset to pending.";

    const decidedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: {
          id,
          approvalStatus: "PENDING",
        },
        data: {
          approvalStatus,
          approvalNote: approvalNote || null,
          approvedAt: approvalStatus === "APPROVED" ? decidedAt : null,
          deniedAt: approvalStatus === "DENIED" ? decidedAt : null,
          status: nextOrderStatus,
          paymentStatus:
            approvalStatus === "DENIED"
              ? "CANCELLED"
              : approvalStatus === "APPROVED"
                ? "PAYMENT_DUE"
                : undefined,
        },
      });

      if (result.count === 0) {
        return null;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: nextOrderStatus,
          note: decisionNote,
        },
      });

      return tx.order.findUnique({
        where: { id },
      });
    });

    if (!updated) {
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        select: {
          approvalStatus: true,
        },
      });

      if (!existingOrder) {
        return NextResponse.json(
          { error: "Order not found." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "This order has already received a final approval decision." },
        { status: 400 },
      );
    }

    if (approvalStatus === "APPROVED" || approvalStatus === "DENIED") {
        await sendAppEmail({
          to: updated.customerEmail,
          subject:
            approvalStatus === "APPROVED"
              ? "Your order has been approved"
              : "Your order was not approved",
          react: OrderApprovalEmail({
            customerName: updated.customerName,
            orderId: updated.id,
            approved: approvalStatus === "APPROVED",
            orderUrl: updated.userId ? `${appUrl}/orders/${updated.id}` : null,
            approvalNote,
          }),
        });
      }
    await writeAdminAuditLog({
      session,
      action:
        approvalStatus === "APPROVED"
          ? "ORDER_APPROVED"
          : approvalStatus === "DENIED"
            ? "ORDER_DENIED"
            : "ORDER_APPROVAL_RESET",
      entityType: "Order",
      entityId: updated.id,
      metadata: { approvalStatus },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update approval." }, { status: 500 });
  }
}
