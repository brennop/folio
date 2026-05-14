import { useState } from "react";
import AssetGroups from "@/components/AssetGroups";
import AssetList from "@/components/AssetList";

const tabs = [
  { key: "assets", label: "Ativos" },
  { key: "groups", label: "Agrupado" },
];

export default function AssetViews({
  assets,
  assetValues = {},
  indices,
  onDelete,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex border-b border-zinc-800" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-zinc-100 text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "assets" ? (
          <AssetList
            assets={assets}
            assetValues={assetValues}
            indices={indices}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : (
          <AssetGroups assets={assets} assetValues={assetValues} />
        )}
      </div>
    </section>
  );
}
