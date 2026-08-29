import type { MenuItem } from "@/types/menu";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import Image from "next/image";

type MenuCardProps = {
  item: MenuItem;
};

export function MenuCard({ item }: MenuCardProps) {
  const detailsId = `menu-item-${item.id}`;

  return (
    <article className="brand-card group flex h-full flex-col overflow-hidden transition hover:shadow-2xl">
      <a
        href={`#${detailsId}`}
        className="relative aspect-[4/3] overflow-hidden bg-[#f7ead7] text-left"
        aria-label={`View details for ${item.name}`}
      >
        <Image
          src={item.imageUrl || "/placeholder1.png"}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized
        />

        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-black text-[#24130f] shadow-sm">
          ${item.price.toFixed(2)}
        </span>

        <span className="absolute bottom-3 left-3 rounded-full bg-[#24130f]/90 px-3 py-1 text-xs font-black uppercase text-white shadow-sm">
          View Details
        </span>
      </a>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#f4eadb] px-3 py-1 font-semibold text-[#6f1f12]">
            {item.category}
          </span>

          {item.seasonal && (
            <span className="rounded-full bg-[#fff0bd] px-3 py-1 font-semibold text-[#8a5a00]">
              Seasonal
            </span>
          )}

          {!item.available && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
              Unavailable
            </span>
          )}
        </div>

        <a
          href={`#${detailsId}`}
          className="text-left text-xl font-black leading-tight transition hover:text-[#9f2f18]"
        >
          {item.name}
        </a>

        <p className="mt-3 flex-1 break-words text-sm leading-6 text-[#6b5a50]">
          {item.description}
        </p>

        {item.allergens?.length ? (
          <p className="mt-4 text-xs font-medium text-[#6b5a50]">
            Allergens: {item.allergens.map((a) => a.name).join(", ")}
          </p>
        ) : null}

        {item.optionGroups?.length ? (
          <p className="mt-4 text-xs font-bold uppercase text-[#9f2f18]">
            {item.optionGroups.length} customization group
            {item.optionGroups.length === 1 ? "" : "s"} available
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <a
            href={`#${detailsId}`}
            className="rounded-lg border border-[#d7bea1] bg-white px-4 py-3 text-sm font-black text-[#6f1f12] transition hover:border-[#9f2f18] hover:bg-[#fff8ee]"
          >
            View Details
          </a>

          <AddToCartButton item={item} />
        </div>
      </div>

      <div id={detailsId} className="menu-item-detail-modal">
        <a
          href="#menu"
          className="absolute inset-0 cursor-default"
          aria-label="Close item details"
        />

        <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-[#fff8ee] p-5 shadow-2xl sm:p-6">
          {item.imageUrl && (
            <div className="relative mb-6 aspect-[16/7] overflow-hidden rounded-lg bg-[#f7ead7]">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
                unoptimized
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#24130f]/80 to-transparent p-5 text-white">
                <p className="text-sm font-black uppercase tracking-wide">
                  {item.category}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="brand-eyebrow">Menu Details</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">
                {item.name}
              </h2>
              <p className="mt-2 leading-7 text-[#6b5a50]">
                {item.description}
              </p>
            </div>

            <a
              href="#menu"
              className="rounded-full border border-[#d7bea1] bg-white px-3 py-1 text-sm font-bold text-[#24130f] transition hover:border-[#9f2f18]"
            >
              Close
            </a>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[#ead8c1] bg-white p-4">
              <p className="text-xs font-black uppercase text-[#9f2f18]">
                Starting At
              </p>
              <p className="mt-1 text-2xl font-black">
                ${item.price.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg border border-[#ead8c1] bg-white p-4">
              <p className="text-xs font-black uppercase text-[#9f2f18]">
                Options
              </p>
              <p className="mt-1 font-bold">
                {item.optionGroups?.length
                  ? `${item.optionGroups.length} group${
                      item.optionGroups.length === 1 ? "" : "s"
                    }`
                  : "Ready as listed"}
              </p>
            </div>

            <div className="rounded-lg border border-[#ead8c1] bg-white p-4">
              <p className="text-xs font-black uppercase text-[#9f2f18]">
                Allergens
              </p>
              <p className="mt-1 font-bold">
                {item.allergens?.length
                  ? item.allergens.map((a) => a.name).join(", ")
                  : "Ask if needed"}
              </p>
            </div>
          </div>

          {item.optionGroups?.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {item.optionGroups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-lg border border-[#ead8c1] bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{group.name}</h3>
                    {group.required && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        Required
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-neutral-500">
                    {group.multiple ? "Choose one or more" : "Choose one"}
                  </p>

                  <div className="mt-4 space-y-2">
                    {group.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{choice.name}</p>
                          <div className="flex items-center gap-2">
                            {choice.requestOnly && (
                              <span className="rounded-full bg-[#fff0bd] px-2 py-1 text-xs font-bold text-[#8a5a00]">
                                Request Only
                              </span>
                            )}
                            {choice.priceDelta > 0 && (
                              <span className="text-sm font-medium">
                                +${choice.priceDelta.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {choice.description && (
                          <p className="mt-2 text-sm text-neutral-600">
                            {choice.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
