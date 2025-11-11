"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Pagination from "../components/Pagination";
import ExpandableCell from "../components/ExpandableCell";

export default function AuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit?page=${page}&limit=${limit}`);
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
      setLoading(false);
    }
    fetchLogs();
  }, [page, limit]);

  function buildRollbackQuery(log) {
    const beforeData = log.before_data ? JSON.parse(log.before_data) : null;
    let sql = "";

    if (log.operation_type === "INSERT") {
      // Rollback INSERT → DELETE row
      // Use executed_sql to extract table and PK if available
      if (!beforeData && log.executed_sql) {
        // crude way: assume INSERT INTO ... (cols) VALUES (...)
        // we'll just turn it into DELETE using primary key if available
        // safer: store the inserted PK in executed_sql or another field
        sql = `DELETE FROM ${log.table_name} WHERE http_method_id = (SELECT http_method_id FROM (${log.executed_sql}) AS t)`;
      } else if (beforeData) {
        // fallback: if beforeData somehow exists (rare for insert)
        sql = `DELETE FROM ${log.table_name} WHERE http_method_id = '${beforeData.http_method_id}'`;
      } else {
        throw new Error("No executed_sql available for INSERT rollback");
      }
    } else if (log.operation_type === "UPDATE") {
      // Rollback UPDATE → restore old values
      if (!beforeData) throw new Error("No before_data available for UPDATE rollback");

      const cols = Object.keys(beforeData).filter((c) => c !== "http_method_id");
      const setClause = cols
        .map((c) => `${c} = ${beforeData[c] === null ? "NULL" : `'${beforeData[c]}'`}`)
        .join(", ");
      sql = `UPDATE ${log.table_name} SET ${setClause} WHERE http_method_id = '${beforeData.http_method_id}'`;
    } else if (log.operation_type === "DELETE") {
      // Rollback DELETE → reinsert old row
      if (!beforeData) throw new Error("No before_data available for DELETE rollback");

      const cols = Object.keys(beforeData);
      const values = cols
        .map((c) => (beforeData[c] === null ? "NULL" : `'${beforeData[c]}'`))
        .join(", ");
      sql = `INSERT INTO ${log.table_name} (${cols.join(", ")}) VALUES (${values})`;
    }

    return sql;
  }

  const handleRollback = async (log) => {
    if (!confirm("Are you sure you want to rollback this operation?")) return;

    try {
      // 1. Build rollback SQL on frontend
      const rollbackSql = buildRollbackQuery(log);

      // 2. Call API to execute in target DB
      const res = await fetch(`/api/audit/${log.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environmentId: log.environment_id, // use to select DB (MySQL/Postgres, UAT/PROD, etc.)
          sql: rollbackSql,
        }),
      });

      if (!res.ok) throw new Error("Failed to rollback");

      const result = await res.json();
      alert(result.message || "Rollback successful");
      router.refresh();
    } catch (err) {
      console.error("Rollback error:", err);
      alert("Rollback failed. Please check logs or try again.");
    }
  };

  return (
    <div className="font-sans">
      <TopNav title="Audit Logs" />
      <div className="flex flex-col h-[calc(100vh-120px)] relative"> 
      {loading ? (
        <p className="text-center p-4">Loading...</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full border border-gray-300 dark:border-gray-600 table-auto text-sm">
            <thead className="bg-blue-400 text-white">
              <tr>
                <th className="px-2 py-2 border">ID</th>
                <th className="px-2 py-2 border">DB Type</th>
                <th className="px-2 py-2 border">Env</th>
                <th className="px-2 py-2 border">Db Name</th>
                <th className="px-2 py-2 border">Table</th>
                <th className="px-2 py-2 border">Operation</th>
                <th className="px-2 py-2 border">Before Data</th>
                <th className="px-2 py-2 border">Executed SQL</th>
                <th className="px-2 py-2 border">Executed By</th>
                <th className="px-2 py-2 border">Executed At</th>
                <th className="px-2 py-2 border">Rollback</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <td className="px-2 py-2 border text-center">{log.id}</td>
                  <td className="px-2 py-2 border">{log.db_type}</td>
                  <td className="px-2 py-2 border">{log.env}</td>
                  <td className="px-2 py-2 border">{log.db_name}</td>
                  <td className="px-2 py-2 border">{log.table_name}</td>
                  <td className="px-2 py-2 border">{log.operation_type}</td>
                  <td className="px-2 py-2 border">
                     <ExpandableCell text={log.before_data} maxLength={200} />
                  </td>
                  <td className="px-2 py-2 border">
                      <ExpandableCell text={log.executed_sql} maxLength={120} copyable />
                  </td>
                  <td className="px-2 py-2 border">{log.executed_by}</td>
                  <td className="px-2 py-2 border">
                    {new Date(log.executed_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 border text-center"> 
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" onClick={() => handleRollback(log)}
                      >Rollback</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="sticky bottom-0 bg-white border-t shadow-sm">
        <Pagination
          totalItems={totalCount}
          currentPage={page}
          onPageChange={(newPage) =>
            router.push(`/audit?page=${newPage}&limit=${limit}`, { scroll: false })
          }
          onItemsPerPageChange={(newLimit) => {
            router.push(`/audit?page=1&limit=${newLimit}`, { scroll: false });
          }}
        />
      </div>
    </div>
    </div>
  );
}
