"use client";
import { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useDb } from "../context/DbContext";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import Modal from "../components/Modal";
import { RotateCcw, Trash2, Plus, Edit } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import TopNav from "../components/TopNav"; 
import Alert from "../components/Alert";
import PopupAlert from "../components/PopupAlert";


export default function SelectTablePage() {
  const { payload } = useDb();
  const { dbType, envA, envB } = payload;
  const [tables, setTables] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(true);
  // Primary Key
  const [primaryKeys, setPrimaryKeys] = useState([]);
  // Column
  const [columns, setColumns] = useState([]);
  // Key Column
  const [selectedKeyColumn, setSelectedKeyColumn] = useState("");
  // Compare Columns
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [loadingCols, setLoadingCols] = useState(false);
  // Row
  const [rowDiff, setRowDiff] = useState([]);
  const [diffLoading, setDiffLoading] = useState(false);
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSQL, setSelectedSQL] = useState("");
  const [mode, setMode] = useState("single"); // "single" | "bulk"
  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Previous row snapshot for audit logging
  const [selectedDiff, setSelectedDiff] = useState(null);
  // Set row count variables
  const [rowACount, setRowACount] = useState(0);  
  const [rowBCount, setRowBCount] = useState(0);
  //Alert
  const [alert, setAlert] = useState({ type: "", message: "" });


  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const openModal = (sql, diff) => {
    setSelectedSQL(sql);
    setIsModalOpen(true);
    setMode("single");
    setSelectedDiff(diff); // <-- store the diff object too
  }

  useEffect(() => {
    async function fetchCommonTables() {
      try {
        const [resA, resB] = await Promise.all([
          fetch("/api/get-tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA }),
          }),
          fetch("/api/get-tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB }),
          }),
        ]);

        const dataA = await resA.json();
        const dataB = await resB.json();

        const commonTables = dataA.tables.filter((t) => dataB.tables.includes(t));
        setTables(commonTables);
        if (commonTables.length) setSelectedTable(commonTables[0]);
      } catch (err) {
        console.error("Failed to fetch tables:", err);
        setConnectionError("Connection error: Failed to fetch tables");
      } finally {
        setLoading(false);
      }
    }

    fetchCommonTables();
  }, []);

  useEffect(() => {
    if (!selectedTable) return;

    async function fetchColumns() {
      setLoadingCols(true);
      try {
        const [resA, resB] = await Promise.all([
          fetch("/api/get-columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA, table: selectedTable }),
          }),
          fetch("/api/get-columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB, table: selectedTable }),
          }),
        ]);

        const dataA = await resA.json();
        const dataB = await resB.json();

        const commonColumns = dataA.columns.filter((t) => dataB.columns.includes(t));
        setColumns(commonColumns);
        // Extract and compare primary keys (optional, if needed)
        const commonPKs = dataA.primaryKeys.filter(pk => dataB.primaryKeys.includes(pk));
        setPrimaryKeys(commonPKs); // <-- You need to define setPrimaryKeys via useState
        
        if (commonColumns.length) {
          setSelectedKeyColumn(commonColumns[0]);
          setSelectedColumns([commonColumns[0]]);
        }
      } catch (error) {
        console.error("Error fetching columns:", error);
      } finally {
        setLoadingCols(false);
      }
    }
    fetchColumns();
  }, [selectedTable]);

  const fetchDiffs = async () => {
    if (!selectedTable || selectedColumns.length === 0 || primaryKeys.length === 0 || !selectedKeyColumn) return;
    setDiffLoading(true);
    
    const getPkValues = (row) =>
      Object.fromEntries(primaryKeys.map((pk) => [pk, row[pk]]));

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/get-row-diff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbType, ...envA, table: selectedTable }),
        }),
        fetch("/api/get-row-diff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbType, ...envB, table: selectedTable }),
        }),
      ]);

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
      
      const rowsA = dataA.data || [];
      const rowsB = dataB.data || [];

      setRowACount(dataA.count);
      setRowBCount(dataB.count);

      // Create a map of rows by selectedColumn
      const mapA = new Map(rowsA.map(row => [row[selectedKeyColumn], row]));
      const mapB = new Map(rowsB.map(row => [row[selectedKeyColumn], row]));

      const diffs = [];

      for (const [keyValue, rowA] of mapA.entries()) {
        const rowB = mapB.get(keyValue);
        if (!rowB) {
            diffs.push({
              type: "INSERT",
              key: keyValue,
              row: rowA,
              buttonName: "INSERT to B",
              buttonClass: "bg-green-600 hover:bg-green-500", // Tailwind classes for green
              pkValues: getPkValues(rowA),
            });
        } else {
          const diffObjA = {};
          const diffObjB = {};
          let hasDiff = false;

          selectedColumns.forEach((col) => {
            if (rowA[col] !== rowB[col]) {
              diffObjA[col] = rowA[col];
              diffObjB[col] = rowB[col];
              hasDiff = true;
            }
          });

          if (hasDiff) {
            diffs.push({
              type: "UPDATE",
              key: keyValue,
              row: diffObjA,
              oldRow: diffObjB,
              buttonName: "UPDATE to B",
              buttonClass: "bg-yellow-600 hover:bg-yellow-500", // Tailwind classes for yellow
              pkValues: getPkValues(rowA),
            })
          }
        }
      }
      for (const [keyValue, rowB] of mapB.entries()) {
        if (!mapA.has(keyValue)) {
          diffs.push({
            type: "DELETE",
            key: keyValue,
            oldRow: rowB, // showing what would be deleted
            buttonName: "DELETE from B",
            buttonClass: "bg-red-600 hover:bg-red-500", // Tailwind red for delete
            pkValues: getPkValues(rowB)
          });
        }
      }
      console.log("Diffs:", diffs);
      setRowDiff(diffs);
    } catch (err) {
      console.error("Error fetching diff:", err);
    } finally {
      setDiffLoading(false);
    }
  }

  useEffect(() => {
    fetchDiffs();
  }, [selectedColumns, selectedTable, primaryKeys, selectedKeyColumn]);

  function generateSQL(diff) {
    if (!diff || (!diff.row && !diff.oldRow)) return "";

    const newRow = diff.row;
    const oldRow = diff.oldRow || {};

    if (diff.type.startsWith("INSERT")) {
      const keys = Object.keys(newRow).join(", ");
      const values = Object.values(newRow)
        .map((v) => sqlValueFormatter(v))
        .join(", ");
      return `INSERT INTO ${selectedTable} (${keys}) VALUES (${values});`;
    }

    if (diff.type.startsWith("UPDATE")) {
      const setClause = Object.entries(newRow)
        .map(([k, v]) => `${k}=${sqlValueFormatter(v)}`)
        .join(", ");

      const whereClause = diff.pkValues
        ? Object.entries(diff.pkValues)
            .map(([pk, val]) => {
              const safeVal =
                typeof val === "number"
                  ? val
                  : `${sqlValueFormatter(v)}`;
              return `${pk}=${safeVal}`;
            })
            .join(" AND ")
        : "-- Missing PK values";


      return `UPDATE ${selectedTable} SET ${setClause} WHERE ${whereClause};`;
    }

    if (diff.type.startsWith("DELETE")) {
      const whereClause = diff.pkValues
        ? Object.entries(diff.pkValues)
            .map(([pk, val]) => {
              const safeVal =
                typeof val === "number"
                  ? val
                  : `${sqlValueFormatter(v)}`;
              return `${pk}=${safeVal}`;
            })
            .join(" AND ")
        : "-- Missing PK values";
      return `DELETE FROM ${selectedTable} WHERE ${whereClause};`;
    }

    return "-- Not supported";
  }

  function sqlValueFormatter(value) {
    if (value == null) return "NULL";

    // Detect ISO 8601 date string
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

    if (typeof value === "string" && isoDateRegex.test(value)) {
      const d = new Date(value);
      const pad = (n) => String(n).padStart(2, "0");

      if (dbType?.toLowerCase() === "mysql") {
        // MySQL DATETIME: YYYY-MM-DD HH:MM:SS
        return `'${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}'`;
      }

      if (dbType?.toLowerCase() === "postgresql") {
        // PostgreSQL can accept ISO but let's format to match timestamp style
        return `'${d.toISOString().replace("T", " ").replace("Z", "")}'`;
      }
    }

    // Escape single quotes for safe SQL strings
    return `'${String(value).replace(/'/g, "''")}'`;  
  }

  const handleExecute = async (modifiedSQL, isBulkExecution = false) => {
    console.log("Executing SQL:", modifiedSQL);
      try {
        const res = await fetch("/api/modify-row", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            dbType,
            ...envB,
            sql: modifiedSQL,
            tableName: selectedTable,
            operationType: selectedDiff?.type,
            pkValues: selectedDiff?.pkValues || {}, 
            beforeData:
              selectedDiff?.type === "UPDATE"
                ? selectedDiff?.oldRow || {}
                : selectedDiff?.type === "DELETE"
                  ? selectedDiff?.row || {}
                  : {}, // for INSERT, keep it empty
            env: envB.name,
           }),
        });

        const result = await res.json();
        if (res.ok) {
          console.log("Execution result:", result.data);
          if (!isBulkExecution) {
            setAlert({ type: "success", message: `Query executed successfully. Rows affected: ${result.data.rowCount}` });
            // Refresh table diff immediately
            await fetchDiffs();
            setIsModalOpen(false);
          }
          return true; // indicate success for bulk
        } else {
          console.error("Error executing query:", result.error);
           if (!isBulkExecution) {
            setAlert({ type: "error", message: `Error: ${result.error}` });
           } 
           return false; // indicate failure for bulk
        }
    } catch (err) {
      console.error("Network error:", err);
       if (!isBulkExecution) {
        setAlert({ type: "error", message: `Network error: ${err.message}` });
       }
       return false; // indicate failure for bulk
    }
   
  };

  useEffect(() => {
    if (alert.message) {
      const timer = setTimeout(() => setAlert({ type: "", message: "" }), 2500);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const openBulkModal = () => {
    console.log("Opening bulk modal");
    const allSQL = rowDiff.map(diff => generateSQL(diff)).join("\n\n");
    console.log("Generated SQL for bulk execution:", allSQL);
    setSelectedSQL(allSQL);
    setMode("bulk");
    setIsModalOpen(true);
  };

  const handleBulkExecute = async (bulkSQL) => {
    console.log("Bulk executing SQL:", bulkSQL);
    const queries = bulkSQL
      .split(";")
      .map((q) => q.trim())
      .filter(Boolean);

    let successCount = 0;
    let failureCount = 0;

    for (const sql of queries) {
      const ok = await handleExecute(sql, true); // no per-row alerts
      if (ok) successCount++;
      else failureCount++;
    }

    if (failureCount > 0) {
      setAlert({
        type: "error",
        message: `Bulk execution completed with ${failureCount} failures (success: ${successCount}).`,
      });
    } else {
      setAlert({
        type: "success",
        message: `All ${successCount} queries executed successfully.`,
      });
    }

    await fetchDiffs();
    setIsModalOpen(false);
  };



return (
  <div className="font-sans">
  <TopNav title="Select Common Table" />  
  {alert.message && (
    <PopupAlert type={alert.type} message={alert.message} onClose={() => setAlert({ type: "", message: "" })}/>
  )}
  {loading ? (
    <p>Loading tables...</p>
  ) : tables.length === 0 ? (
    connectionError ? ( <p className="text-red-500">{connectionError}</p>) : (
      <p className="text-red-500">No common tables found.</p>
    )
  ) : (
    <>
      {/* 🔹 Filter with dropdowns and buttons */}
      <div className="mb-4 flex items-center gap-6 sticky top-0 z-30 bg-white dark:bg-gray-900  h-12 px-2 shadow">
        {/* Table Dropdown */}
        <div>
          <label htmlFor="tableSelect" className="font-medium mr-2">Table:</label>
          <select
            id="tableSelect"
            className="border px-2 py-1 rounded bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            {tables.map((table) => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </div>

        {/* Column Dropdown for key */}
        <div className="flex items-center gap-2">
          <label htmlFor="columnKeySelect" className="font-medium">
          Key Column:</label>
        <select
            id="columnKeySelect"
            className="border px-2 py-1 rounded bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={selectedKeyColumn}
            onChange={(e) => setSelectedKeyColumn([e.target.value])}
          >
            <option value="">-- Select Key Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

        </div>

        {/* Column Dropdown */}
        <div className="flex items-center gap-2 relative z-50 overflow-visible">
          <label htmlFor="columnSelect" className="font-medium">
            Compare Column (Optional):
          </label>
          {loadingCols ? (
            <span>Loading...</span>
          ) : columns.length === 0 ? (
            <span className="text-red-500">No common columns</span>
          ) : (
            <MultiSelectDropdown
              options={columns}
              selectedValues={selectedColumns}
              onChange={setSelectedColumns}
            />
          )}
        </div>

        {/* 🔹 Refresh Button */}
        <button
          type="button"
          onClick={fetchDiffs}
          title="Refresh"  //native hover tooltip
        >
          <RotateCcw
            size={22}
            className="cursor-pointer text-blue-600 hover:text-blue-500 transition"
            onClick={fetchDiffs}
          />
        </button>
        {/* 🔹 Bulk Execute Button */}
        <button
          type="button"
          onClick={openBulkModal}
          title="Bulk Execute"
          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded"
        >
          <span>Bulk Execute</span>
        </button>

      </div>

      {/* Diff column */}
      {diffLoading ? (
        <p>Loading row differences...</p>
      ) : rowDiff.length === 0 ? (
        <p className="text-green-600">No differences found.</p>
      ) : (
        <div className="mt-2 max-w-full overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-[minmax(80px,1fr)_minmax(120px,2fr)_minmax(120px,2fr)_minmax(150px,3fr)_minmax(80px,1fr)]
             bg-green-900 text-white sticky top-0 z-20">
            <div className="px-2 py-1 border-r dark:border-gray-600 flex items-center justify-center text-center">
              PK {primaryKeys.join(", ")}
            </div>
            <div className="px-2 py-1 border-r dark:border-gray-600 text-center">
              {envA ? envA.name : "Env A"}
              <div className="text-xs text-gray-200">Rows: {rowACount ?? "—"}</div>
            </div>
            <div className="px-2 py-1 border-r dark:border-gray-600 text-center">
              {envB ? envB.name : "Env B"}
              <div className="text-xs text-gray-200">Rows: {rowBCount ?? "—"}</div>
            </div>
            <div className="px-2 py-1 border-r dark:border-gray-600 items-center justify-center text-center">
              SQL 
              <div className="text-xs text-gray-200">Diff: {rowDiff.length}</div>
            </div>
            <div className="px-2 py-1 flex items-center justify-center text-center">
              Action
            </div>
          </div>

          {/* End of header */}
          {/* Body */}
          {/* Virtualized body */}
          <div className="border border-gray-300 dark:border-gray-600 border-t-0">
            <List
              height={575} // viewport height
              itemCount={rowDiff.length}
              itemSize={200} // fixed row height, tweak as needed
              width={"100%"}
              className="border border-t-0 border-gray-300 dark:border-gray-600"
            >
              {({ index, style }) => {
                const diff = rowDiff[index];
                const sql = generateSQL(diff);
                const rowJson = JSON.stringify(diff.row, null, 2);
                const oldRowJson = diff.oldRow ? JSON.stringify(diff.oldRow, null, 2) : "—";

                return (
                  <div
                    key={index}
                    style={style}
                    className={`grid grid-cols-[minmax(80px,1fr)_minmax(120px,2fr)_minmax(120px,2fr)_minmax(150px,3fr)_minmax(80px,1fr)]
 border-t dark:border-gray-700 text-xs ${
                      index === rowDiff.length - 1 ? "border-b" : ""
                    }`}
                  >
                    {/* PK */}
                    <div className="px-2 py-1 break-all whitespace-pre-wrap border-r dark:border-gray-700">
                      {diff.key}
                    </div>

                    {/* Env A */}
                    <div className="px-2 py-1 border-r dark:border-gray-700 font-mono text-green-700 dark:text-green-400 overflow-x-auto">
                      <SyntaxHighlighter
                        language="json"
                        style={isDarkMode ? oneDark : oneLight}
                        wrapLongLines
                        PreTag="div"
                        codeTagProps={{ style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } }}
                        customStyle={{ fontSize: "0.75rem", margin: 0 }}
                      >
                        {rowJson}
                      </SyntaxHighlighter>
                    </div>

                    {/* Env B */}
                    <div className="px-2 py-1 border-r dark:border-gray-700 font-mono text-red-700 dark:text-red-400 overflow-x-auto">
                      <SyntaxHighlighter
                        language="json"
                        style={isDarkMode ? oneDark : oneLight}
                        wrapLongLines
                        PreTag="div"
                        codeTagProps={{ style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } }}
                        customStyle={{ fontSize: "0.75rem", margin: 0 }}
                      >
                        {oldRowJson}
                      </SyntaxHighlighter>
                    </div>

                    {/* SQL */}
                    <div className="px-2 py-1 border-r dark:border-gray-700 font-mono dark:text-indigo-300 overflow-x-auto">
                      <SyntaxHighlighter
                        language="sql"
                        style={isDarkMode ? oneDark : oneLight}
                        wrapLongLines
                        PreTag="div"
                        codeTagProps={{ style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } }}
                        customStyle={{ fontSize: "0.75rem", margin: 0 }}
                      >
                        {sql}
                      </SyntaxHighlighter>
                    </div>

                    {/* Action */}
                    <div className="px-2 py-1 flex items-center justify-center">
                      <button
                        className={`${diff.buttonClass} text-white px-2 py-1 rounded`}
                        onClick={() => openModal(generateSQL(diff), diff)}
                      >
                        {diff.type === "DELETE" ? (
                          <span className="flex items-center gap-1">
                            <Trash2 size={16} />
                            <span>from B</span>
                          </span>
                        ) : diff.type === "INSERT" ? (
                          <span className="flex items-center gap-1">
                            <Plus size={16} />
                            <span>to B</span>
                          </span>
                        ) : diff.type === "UPDATE" ? (
                          <span className="flex items-center gap-1">
                            <Edit size={16} />
                            <span>to B</span>
                          </span>
                        ) : null}
                      </button>
                    </div>
                  </div>
                );
              }}
            </List>
          </div>
          {/* End of body */}
          {/* Modal */}
          <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onExecute={(sql) => {
              if (mode === "bulk") {
                handleBulkExecute(sql);
              } else {
                handleExecute(sql);
              }
            }}
            initialSQL={selectedSQL}
            >
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
              SQL Query
            </h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
              {selectedSQL}
            </pre>
          </Modal>

        </div>

      )}

    </>
  )}
</div>
);

}