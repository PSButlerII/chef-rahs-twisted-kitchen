import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { MenuItemForm } from "@/components/admin/MenuItemForm";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";
import { AdminHelpPopover } from "@/components/admin/AdminHelpPopover";
import { MenuItemCustomizationEditor } from "@/components/admin/MenuItemCustomizationEditor";
import { MenuAvailabilityToggle } from "@/components/admin/MenuAvailabilityToggle";
import { MenuItemEditForm } from "@/components/admin/MenuItemEditForm";
import { DeleteOptionGroupButton } from "@/components/admin/DeleteOptionGroupButton";
import { EditOptionChoiceForm } from "@/components/admin/EditOptionChoiceForm";
import { ApplyMealPlanTemplateButton } from "@/components/admin/ApplyMealPlanTemplateButton";
import { ArchiveMenuItemButton } from "@/components/admin/ArchiveMenuItemButton";
import { DeleteMenuItemButton } from "@/components/admin/DeleteMenuItemButton";
import { formatMenuItemType } from "@/lib/format-labels";
import { parseEnumValue } from "@/lib/enum-values";
import { menuItemTypes } from "@/lib/prisma-enums";
import type { DecimalLike } from "@/types/display";

type PageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

const menuTypeTabs = [
  { label: "All", value: "ALL" },
  { label: "Meal Plans", value: "MEAL_PLAN" },
  { label: "A La Carte", value: "A_LA_CARTE" },
  { label: "Catering Related", value: "CATERING" },
  { label: "Plate / Legacy", value: "PLATE" },
  { label: "Desserts", value: "DESSERT" },
  { label: "Sides", value: "SIDE" },
  { label: "Other", value: "OTHER" },
];

type AdminAllergen = {
  id: string;
  name: string;
};

type AdminMenuChoice = {
  id: string;
  name: string;
  description: string | null;
  dietaryInfo: string | null;
  imageUrl: string | null;
  requestOnly: boolean;
  priceDelta: DecimalLike;
};

type AdminMenuOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  choices: AdminMenuChoice[];
};

type AdminMenuItemAllergen = {
  allergen: AdminAllergen;
};

type AdminMenuItem = {
  id: string;
  name: string;
  description: string;
  price: DecimalLike;
  imageUrl: string | null;
  type: string;
  available: boolean;
  seasonal: boolean;
  requiresApproval: boolean;
  customerInstructionsEnabled: boolean;
  allergens: AdminMenuItemAllergen[];
  optionGroups: AdminMenuOptionGroup[];
};

type AdminMenuCategory = {
  id: string;
  name: string;
  items: AdminMenuItem[];
};

export default async function AdminMenuPage({ searchParams }: PageProps) {
  await requireAdminPage();

  const params = await searchParams;
  const selectedType = parseEnumValue(menuItemTypes, params.type) ?? "ALL";

  const categories = (await prisma.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },

    include: {
      items: {
        where: {
          archived: false,
          ...(selectedType !== "ALL"
            ? {
                type: selectedType,
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          allergens: {
            include: {
              allergen: true,
            },
          },

          optionGroups: {
            include: {
              choices: true,
            },
          },
        },
      },
    },
  })) as AdminMenuCategory[];

  const allergens = (await prisma.allergen.findMany({
    orderBy: {
      name: "asc",
    },
  })) as AdminAllergen[];

  const visibleCategories = categories.filter(
    (category) => category.items.length > 0,
  );

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin">
            &larr; Back to Dashboard
          </Link>

          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Menu Manager
          </h1>
          <div className="mt-4 flex items-center gap-3"><AdminPageHelpLink section="standard-menu" /><span className="text-sm font-bold">Types and categories <AdminHelpPopover title="Item Type and Category" summary="Item Type controls behavior; Category controls where the item is grouped for customers." section="standard-menu" /></span></div>

          <p className="mt-3 max-w-3xl text-[#6b5a50]">
            Manage weekly meal plans, a la carte items, customer-facing options,
            pricing, availability, substitutions, and request-only choices.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/admin/menu/weekly" className="admin-button-primary">
            Manage Weekly Menus
          </Link>

          <Link href="/admin/menu/archived" className="admin-button-secondary">
            View Archived Items
          </Link>

          <Link
            href="/admin/menu/categories"
            className="admin-button-secondary"
          >
            Manage Categories
          </Link>
        </div>

        <div className="admin-card mb-8 p-5">
          <p className="mb-1 font-black">Menu Type</p>
          <p className="mb-4 text-sm text-[#6b5a50]">
            Personal chef services are handled through service requests, not
            menu items.
          </p>
          <div className="flex flex-wrap gap-2">
            {menuTypeTabs.map((tab) => {
              const active = selectedType === tab.value;

              return (
                <Link
                  key={tab.value}
                  href={
                    tab.value === "ALL"
                      ? "/admin/menu"
                      : `/admin/menu?type=${tab.value}`
                  }
                  className={`admin-filter-chip ${
                    active ? "admin-filter-chip-active" : ""
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <MenuItemForm />
          </aside>

          <section className="space-y-8">
            {visibleCategories.map((category) => (
              <div key={category.id} className="admin-card p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{category.name}</h2>

                    <p className="mt-1 text-sm text-[#6b5a50]">
                      Showing {category.items.length} item
                      {category.items.length === 1 ? "" : "s"}
                      {selectedType !== "ALL"
                        ? ` in ${formatMenuItemType(selectedType)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {category.items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-lg border border-[#ead8c1] bg-[#fff8ee] shadow-sm open:bg-white"
                    >
                      <summary className="cursor-pointer list-none rounded-lg p-5 transition hover:bg-white">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-black">
                                {item.name}
                              </h3>

                              <span className="admin-badge admin-badge-neutral">
                                {formatMenuItemType(item.type)}
                              </span>

                              {item.seasonal && (
                                <span className="admin-badge admin-badge-warning">
                                  Seasonal
                                </span>
                              )}

                              {item.requiresApproval && (
                                <span className="admin-badge admin-badge-info">
                                  Approval Required
                                </span>
                              )}

                              {item.customerInstructionsEnabled && (
                                <span className="admin-badge admin-badge-neutral">
                                  Instructions Enabled
                                </span>
                              )}
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm text-[#6b5a50]">
                              {item.description}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                              <span className="font-bold">
                                ${Number(item.price).toFixed(2)}
                              </span>

                              <span
                                className={
                                  item.available
                                    ? "font-medium text-green-700"
                                    : "font-medium text-red-700"
                                }
                              >
                                {item.available ? "Available" : "Unavailable"}
                              </span>

                              <span className="text-neutral-500">
                                {item.optionGroups.length} option group
                                {item.optionGroups.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-bold text-[#6b5a50] group-open:hidden">
                            Open details &gt;
                          </div>

                          <div className="hidden text-sm font-bold text-[#6b5a50] group-open:block">
                            Close details ^
                          </div>
                        </div>
                      </summary>

                      <div className="border-t p-5">
                        <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
                          <div className="rounded-lg border border-[#ead8c1] bg-white p-4">
                            <h4 className="font-black">Item Details</h4>

                            <p className="mt-3 text-sm leading-6 text-[#6b5a50]">
                              {item.description}
                            </p>

                            <p className="mt-3 text-lg font-bold">
                              ${Number(item.price).toFixed(2)}
                            </p>
                          </div>

                          <div className="rounded-lg border border-[#ead8c1] bg-white p-4">
                            <p className="text-sm font-black">Actions</p>

                            <div className="mt-3 grid gap-2">
                              <MenuAvailabilityToggle
                                menuItemId={item.id}
                                available={item.available}
                              />

                              <MenuItemEditForm
                                item={{
                                  id: item.id,
                                  name: item.name,
                                  description: item.description,
                                  price: Number(item.price),
                                  imageUrl: item.imageUrl,
                                  type: item.type,
                                  categoryName: category.name,
                                  seasonal: item.seasonal,
                                  requiresApproval: item.requiresApproval,
                                  customerInstructionsEnabled:
                                    item.customerInstructionsEnabled,
                                }}
                              />

                              <ArchiveMenuItemButton menuItemId={item.id} />

                              <DeleteMenuItemButton
                                menuItemId={item.id}
                                itemName={item.name}
                              />

                              {item.type === "MEAL_PLAN" && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="mb-2 text-xs text-amber-900">
                                    Adds customer-facing spice level and protein
                                    substitution choices for fixed meal plans.
                                  </p>

                                  <ApplyMealPlanTemplateButton
                                    menuItemId={item.id}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.optionGroups.length > 0 && (
                          <section className="admin-card mt-6 p-5 shadow-none">
                            <div className="mb-4">
                              <h4 className="text-lg font-black">
                                Option Groups
                              </h4>

                              <p className="mt-1 text-sm text-[#6b5a50]">
                                Customer-facing choices for this item.
                              </p>
                            </div>

                            <div className="space-y-5">
                              {item.optionGroups.map((group) => (
                                <details
                                  key={group.id}
                                  className="group rounded-lg border border-[#ead8c1] bg-[#fff8ee]"
                                >
                                  <summary className="cursor-pointer list-none p-4 transition hover:bg-white">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-black">
                                          {group.name}
                                        </p>

                                        <p className="mt-1 text-xs text-[#6b5a50]">
                                          {group.required
                                            ? "Required"
                                            : "Optional"}{" "}
                                          -{" "}
                                          {group.multiple
                                            ? "Multiple"
                                            : "Single"}{" "}
                                          - {group.choices.length} choice
                                          {group.choices.length === 1
                                            ? ""
                                            : "s"}
                                        </p>
                                      </div>

                                      <div className="text-xs font-bold text-[#6b5a50] group-open:hidden">
                                        Open choices &gt;
                                      </div>

                                      <div className="hidden text-xs font-bold text-[#6b5a50] group-open:block">
                                        Close choices ^
                                      </div>
                                    </div>
                                  </summary>

                                  <div className="border-t p-4">
                                    <div className="mb-4 flex justify-end">
                                      <DeleteOptionGroupButton
                                        optionGroupId={group.id}
                                      />
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                      {group.choices.map((choice) => (
                                        <div
                                          key={choice.id}
                                          className="rounded-lg border border-[#ead8c1] bg-white p-4"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-black">
                                                  {choice.name}
                                                </p>

                                                {choice.requestOnly && (
                                                  <span className="admin-badge admin-badge-warning px-2 py-0.5">
                                                    Request Only
                                                  </span>
                                                )}
                                              </div>

                                              {choice.description && (
                                                <p className="mt-2 text-xs leading-5 text-[#6b5a50]">
                                                  {choice.description}
                                                </p>
                                              )}

                                              {choice.dietaryInfo && (
                                                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#6b5a50]">
                                                  {choice.dietaryInfo}
                                                </p>
                                              )}

                                              {choice.imageUrl && (
                                                <p className="mt-2 truncate text-xs text-[#6b5a50]">
                                                  Image: {choice.imageUrl}
                                                </p>
                                              )}

                                              {Number(choice.priceDelta) >
                                                0 && (
                                                <p className="mt-2 text-sm font-semibold">
                                                  +$
                                                  {Number(
                                                    choice.priceDelta,
                                                  ).toFixed(2)}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <EditOptionChoiceForm
                                            choice={{
                                              id: choice.id,
                                              name: choice.name,
                                              description: choice.description,
                                              dietaryInfo: choice.dietaryInfo,
                                              imageUrl: choice.imageUrl,
                                              requestOnly: choice.requestOnly,
                                              priceDelta: Number(
                                                choice.priceDelta,
                                              ),
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </details>
                              ))}
                            </div>
                          </section>
                        )}

                        <section className="admin-card mt-6 p-5 shadow-none">
                          <h4 className="text-lg font-black">
                            Add / Manage Customizations
                          </h4>

                          <p className="mt-1 text-sm text-[#6b5a50]">
                            Add allergens, meal plan choices, substitutions,
                            request-only options, and customer-facing
                            selections.
                          </p>

                          <MenuItemCustomizationEditor
                            menuItemId={item.id}
                            allergens={allergens}
                            selectedAllergenIds={item.allergens.map(
                              (entry) => entry.allergen.id,
                            )}
                          />
                        </section>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}

            {visibleCategories.length === 0 && (
              <div className="admin-card p-8 text-center">
                <p className="font-bold">No menu items found.</p>

                <p className="mt-2 text-sm text-[#6b5a50]">
                  Try another menu type tab, or create a new item using the
                  form.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
