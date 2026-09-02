import Link from "next/link";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";
import {
  UserRoleManager,
  type RoleManagerUser,
} from "@/components/admin/UserRoleManager";
import { requireOwnerPage } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function AdminRoleManagerPage() {
  const session = await requireOwnerPage();
  const currentUserId = session.user.id;

  if (!currentUserId) {
    notFound();
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  const roleManagerUsers: RoleManagerUser[] = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  return (
    <main className="admin-page">
      <div className="admin-container max-w-6xl">
        <Link className="admin-back-link" href="/admin">
          &larr; Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="admin-eyebrow mt-5">Owner</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Role Manager
          </h1>
          <div className="mt-4"><AdminPageHelpLink section="roles" /></div>
          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Assign customer, admin, and owner access to registered users.
            Accounts must register normally before their role can be changed.
          </p>
        </div>

        <UserRoleManager
          currentUserId={currentUserId}
          users={roleManagerUsers}
        />
      </div>
    </main>
  );
}
