import { useEffect, useState } from "react";

interface Item {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  start_time?: string;
  end_time?: string;
  grace_minutes?: number;
}

export default function ResourceList({
  title,
  subtitle,
  endpoint,
  kind,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  kind: "resource" | "shift";
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/v1/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Request failed");
      setItems(await res.json());
    } catch {
      setError(`Unable to load ${title.toLowerCase()}.`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{i.name}</h3>
                {i.description && <p className="mt-1 text-sm text-slate-500">{i.description}</p>}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  i.is_active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {i.is_active === false ? "Inactive" : "Active"}
              </span>
            </div>
            {kind === "shift" && (
              <div className="mt-4 text-sm text-slate-500">
                {i.start_time?.slice(0, 5)} — {i.end_time?.slice(0, 5)} · {i.grace_minutes} min grace
              </div>
            )}
          </div>
        ))}
      </div>
      {items.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
          No records found.
        </div>
      )}
    </div>
  );
}

