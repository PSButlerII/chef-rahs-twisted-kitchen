import { requireAdminPage } from "@/lib/auth-guards";
import { BusinessSettingsForm } from "@/components/admin/BusinessSettingsForm";
import Link from "next/link";
import { getBusinessSettings } from "@/lib/business-settings";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";
import { AdminHelpPopover } from "@/components/admin/AdminHelpPopover";

export default async function AdminSettingsPage() {
  await requireAdminPage();

  const settings = await getBusinessSettings();

  return (
    <main className="admin-page">
      <div className="admin-container max-w-5xl">
        <Link className="admin-back-link" href="/admin">
          &larr; Back to Dashboard
        </Link>
        <div className="mb-8">
          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Business Settings
          </h1>

          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Manage order rules, delivery fees, late fees, service request
            deposits, and operating preferences.
          </p>
          <div className="mt-4 flex items-center gap-3"><AdminPageHelpLink section="business-settings" /><span className="text-sm font-bold">Setting impact <AdminHelpPopover title="Business Settings impact" summary="These settings can change customer prices, deadlines, and instructions. Review owner-approved changes before saving." section="business-settings" /></span></div>
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-bold">Important: Business Settings can change customer-facing prices, deadlines, and instructions. Review changes before saving.</p>
        </div>

        <BusinessSettingsForm settings={settings} />
      </div>
    </main>
  );
}
