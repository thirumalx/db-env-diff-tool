"use client";

import { useEffect, useState, useRef  } from "react";
import { useDb } from "../context/DbContext";
import TopNav from "../components/TopNav";
import DiffMatchPatch from "diff-match-patch";

export default function DiffTablePage() {
  const { payload } = useDb(); // ✅ from context
  const { dbType, envA, envB } = payload || {};
  const [commonTables, setCommonTables] = useState([]);
  const [uniqueA, setUniqueA] = useState([]);
  const [uniqueB, setUniqueB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [definitionA, setDefinitionA] = useState("");
  const [definitionB, setDefinitionB] = useState("");


  useEffect(() => {
    if (!payload) return;

    async function fetchTables() {
      try {
        setLoading(true);
        setConnectionError(null);

        const [resA, resB] = await Promise.all([
          fetch("/api/get-table", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA }),
          }),
          fetch("/api/get-table", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB }),
          }),
        ]);
        const dataA = await resA.json();
        const dataB = await resB.json();

        // ✅ Ensure both are arrays
        const tablesA = Array.isArray(dataA.data) ? dataA.data : [];
        const tablesB = Array.isArray(dataB.data) ? dataB.data : [];

        const tableNamesInA = tablesA.map((f) => `${f.database_name}.${f.table_name}`);
        const tableNamesInB = tablesB.map((f) => `${f.database_name}.${f.table_name}`);

        const common = tableNamesInA.filter((name) => tableNamesInB.includes(name));
        const onlyInA = tableNamesInA.filter((name) => !tableNamesInB.includes(name));
        const onlyInB = tableNamesInB.filter((name) => !tableNamesInA.includes(name));

        setUniqueA(onlyInA);
        setUniqueB(onlyInB);
        setCommonTables(common);

      } catch (err) {
        console.error("Error loading functions:", err);
        setConnectionError("Failed to connect or fetch function data");
      } finally {
        setLoading(false);
      }
    }

    fetchTables();
  }, [payload]);

  async function handleCompare(tableName) {
    console.log("Comparing table:", tableName);
    setSelectedTable(tableName);
    setDiffLoading(true);

    try {
        console.log("Fetching definitions for:", { tableName });
        const [resA, resB] = await Promise.all([
            fetch("/api/get-table-definition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA, tableName }),
            }),
            fetch("/api/get-table-definition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB, tableName }),
            }),
        ]);

        const dataA = await resA.json();
        const dataB = await resB.json();

        const definitionA = dataA.data || "No definition found";
        const definitionB = dataB.data || "No definition found";
        
        console.log("Table definitions are: ", { definitionA, definitionB });
        setDefinitionA(definitionA);
        setDefinitionB(definitionB);
    } catch (e) {
      console.error("Compare failed:", e);
      setDiffText("❌ Error fetching function definitions.");
    } finally {
      setDiffLoading(false);
    }
  }

  if (!payload)
    return <p className="p-4 text-gray-600">No environment selected.</p>;

  const renderContent = () => {
    if (loading)
      return <p className="text-center text-gray-600 mt-8">Loading...</p>;
    if (connectionError)
      return <p className="text-center text-red-600 mt-8">{connectionError}</p>;

    return (
      <>
        {/* Diff Modal */}
        {selectedTable && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[90%] h-[80%] overflow-auto relative">
              <button
                onClick={() => setSelectedTable(null)}
                className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4 text-center">
                Comparing Table:{" "}
                <span className="text-blue-700">{selectedTable}</span>
              </h2>

              {diffLoading ? (
                  <p className="text-center text-gray-500">Loading diff...</p>
                ) : (
                  <>
                    {/* Side-by-side definitions */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="border rounded p-3 bg-gray-50 overflow-auto h-[35vh]">
                        <h3 className="font-semibold text-blue-700 mb-2">
                          {envA?.name} Definition
                        </h3>
                        <pre className="text-sm whitespace-pre-wrap text-gray-800">
                          {definitionA || "No data"}
                        </pre>
                      </div>

                      <div className="border rounded p-3 bg-gray-50 overflow-auto h-[35vh]">
                        <h3 className="font-semibold text-green-700 mb-2">
                          {envB?.name} Definition
                        </h3>
                        <pre className="text-sm whitespace-pre-wrap text-gray-800">
                          {definitionB || "No data"}
                        </pre>
                      </div>
                    </div>

                    {/* Diff Section */}
                    <div className="border rounded p-3 bg-white shadow-inner">
                      <h3 className="font-semibold text-purple-700 mb-3 text-center">
                        Diff View
                      </h3>
                      <DiffView definitionA={definitionA} definitionB={definitionB} />
                    </div>
                  </>
                )}

            </div>
          </div>
        )}

        {/* Lists */}
        <div className="grid grid-cols-3 gap-1 mt-4 text-sm">
          <DiffColumn title={`Only in ${envA?.name} (${uniqueA.length})`} color="blue" items={uniqueA} />
          <DiffColumn
            title={`Common Tables (${commonTables.length})`}
            color="green"
            items={commonTables}
            onClick={handleCompare}
            selected={selectedTable}
          />
          <DiffColumn title={`Only in ${envB?.name} (${uniqueB.length})`} color="blue" items={uniqueB} />
        </div>
      </>
    );
  };

  return (
    <div className="p-6 font-sans">
      <TopNav title="Functions Comparison" />
      {renderContent()}
    </div>
  );
}

function DiffView({ definitionA, definitionB }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!definitionA || !definitionB) return;

    const cleanA = definitionA.trim().replace(/\r\n|\r|\n/g, "\n");
    const cleanB = definitionB.trim().replace(/\r\n|\r|\n/g, "\n");

    if (cleanA === cleanB) {
      ref.current.innerHTML =
        '<div class="p-4 text-green-700 bg-green-50 rounded text-center">✅ No difference found between environments.</div>';
      return;
    }

    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(cleanA, cleanB);
    dmp.diff_cleanupSemantic(diffs);

    const html = dmp.diff_prettyHtml(diffs);
    ref.current.innerHTML = html;
  }, [definitionA, definitionB]);

  return (
    <pre
      ref={ref}
      className="p-4 rounded overflow-auto whitespace-pre-wrap text-sm bg-gray-50 border"
    />
  );
}



/** Small reusable column component */
function DiffColumn({ title, color, items, onClick, selected }) {
  return (
    <div>
      <h3 className={`text-lg font-semibold text-${color}-700 mb-2`}>{title}</h3>
      <ul className="border p-2 rounded h-[70vh] overflow-auto divide-y divide-gray-300 bg-white shadow-inner">
        {items.length ? (
          items.map((f) => (
            <li
              key={f}
              onClick={onClick ? () => onClick(f) : undefined}
              className={`py-2 px-2 transition-colors cursor-pointer ${
                selected === f ? "bg-green-100" : "hover:bg-green-50"
              }`}
            >
              {f}
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-4">None</p>
        )}
      </ul>
    </div>
  );
}
