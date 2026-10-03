import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { createEntity } from "@/app/admin/actions/content";

type Row = { id: string; draft: Record<string, unknown>; status: string; has_unpublished_changes: boolean; updated_at: string; featured?: boolean };

export function EntityList({ table, rows, empty, extraColumn }: { table: "services" | "films" | "stories"; rows: Row[]; empty: string; extraColumn?: (r: Row) => string }) {
  const label = { services: "service", films: "film", stories: "story" }[table];
  return (
    <>
      <form action={createEntity} className="mb-6">
        <input type="hidden" name="table" value={table} />
        <button type="submit" className="a-btn-primary">New {label}</button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-body/70">{empty}</p>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone text-xs text-body/70">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                {extraColumn ? <th className="p-3">Category</th> : null}
                <th className="p-3">Last edited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone last:border-0">
                  <td className="p-3">
                    <Link href={`/admin/${table}/${r.id}`} className="font-medium underline-offset-2 hover:underline">
                      {String(r.draft?.title || "Untitled")}
                    </Link>
                    {r.featured ? <span className="ml-2"><StatusBadge status="featured" /></span> : null}
                  </td>
                  <td className="p-3">
                    <span className="flex flex-wrap gap-1">
                      <StatusBadge status={r.status} />
                      {r.status === "published" && r.has_unpublished_changes ? <StatusBadge status="changes" label="unpublished changes" /> : null}
                    </span>
                  </td>
                  {extraColumn ? <td className="p-3">{extraColumn(r)}</td> : null}
                  <td className="p-3 text-body/70">{new Date(r.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
