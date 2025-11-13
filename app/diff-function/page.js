"use client";

import { useEffect, useState, useRef } from "react";
import { useDb } from "../context/DbContext";
import TopNav from "../components/TopNav";
import DiffMatchPatch from "diff-match-patch";

export default function DiffFunctionPage() {
  const { payload } = useDb(); // ✅ from context
  const { dbType, envA, envB } = payload || {};
  const [commonFunctions, setCommonFunctions] = useState([]);
  const [uniqueA, setUniqueA] = useState([]);
  const [uniqueB, setUniqueB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [definitionA, setDefinitionA] = useState("");
  const [definitionB, setDefinitionB] = useState("");
  //
  const [viewOnlyEnv, setViewOnlyEnv] = useState(null);
  const [viewOnlyFun, setViewOnlyFun] = useState(null);
  const [viewOnlyDefinition, setViewOnlyDefinition] = useState("");
  const [viewOnlyLoading, setViewOnlyLoading] = useState(false);

  useEffect(() => {
    if (!payload) return;

    async function fetchFunctions() {
      try {
        setLoading(true);
        setConnectionError(null);

        const [resA, resB] = await Promise.all([
          fetch("/api/get-function", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA }),
          }),
          fetch("/api/get-function", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB }),
          }),
        ]);

        const dataA = await resA.json();
        const dataB = await resB.json();

        const funcNamesA =
          dataA.data?.map(
            (f) => f.db_name + "." + (f.ROUTINE_NAME || f.routine_name)
          ) || [];
        const funcNamesB =
          dataB.data?.map(
            (f) => f.db_name + "." + (f.ROUTINE_NAME || f.routine_name)
          ) || [];

        const common = funcNamesA.filter((name) => funcNamesB.includes(name));
        const onlyInA = funcNamesA.filter((name) => !funcNamesB.includes(name));
        const onlyInB = funcNamesB.filter((name) => !funcNamesA.includes(name));

        setUniqueA(onlyInA);
        setUniqueB(onlyInB);
        setCommonFunctions(common);
      } catch (err) {
        console.error("Error loading functions:", err);
        setConnectionError("Failed to connect or fetch function data");
      } finally {
        setLoading(false);
      }
    }

    fetchFunctions();
  }, [payload]);

  async function handleCompare(fnName) {
    setSelectedFunction(fnName);
    setDiffLoading(true);

    try {
      const [schema, routineName] = fnName.includes(".")
        ? fnName.split(".")
        : [null, fnName];

      const [resA, resB] = await Promise.all([
        fetch("/api/compare-function", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbType, ...envA, schema, routineName }),
        }),
        fetch("/api/compare-function", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbType, ...envB, schema, routineName }),
        }),
      ]);

      const dataA = await resA.json();
      const dataB = await resB.json();

      const definitionA =
        dataA.data?.[0]?.ROUTINE_DEFINITION ||
        dataA.data?.[0]?.routine_definition ||
        JSON.stringify(dataA, null, 2);

      const definitionB =
        dataB.data?.[0]?.ROUTINE_DEFINITION ||
        dataB.data?.[0]?.routine_definition ||
        JSON.stringify(dataB, null, 2);
      
      console.log("Function definitions are: ", { definitionA, definitionB });
      setDefinitionA(definitionA);
      setDefinitionB(definitionB);

    } catch (e) {
      console.error("Compare failed:", e);
      setDiffText("❌ Error fetching function definitions.");
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleViewOnly(fnName, env, label) {
    setViewOnlyFun(fnName);
    setViewOnlyEnv(label);
    setViewOnlyLoading(true);
    const [schema, routineName] = fnName.includes(".")
        ? fnName.split(".")
        : [null, fnName];
    try {
      const res = await fetch("/api/compare-function", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dbType, ...env, schema, routineName }),
        });
      const data = await res.json();
      setViewOnlyDefinition(data.data || "No definition found");
    } catch (e) {
      console.error("Error fetching function definition:", e);
      setViewOnlyDefinition("❌ Failed to load definition.");
    } finally {
      setViewOnlyLoading(false);
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
        {selectedFunction && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[90%] h-[80%] overflow-auto relative">
              <button
                onClick={() => setSelectedFunction(null)}
                className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4 text-center">
                Comparing Function:{" "}
                <span className="text-blue-700">{selectedFunction}</span>
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
        {/* View-Only Modal */}
        {viewOnlyFun && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[90%] h-[80%] overflow-auto relative">
              <button
                onClick={() => {
                  setViewOnlyFun(null);
                  setViewOnlyEnv(null);
                  setViewOnlyDefinition("");
                }}
                className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
              >
                ✕
              </button>

              <h2 className="text-xl font-semibold mb-4 text-center">
                Function Definition: <span className="text-blue-700">{viewOnlyFun}</span>
              </h2>

              {viewOnlyLoading ? (
                <p className="text-center text-gray-500">Loading definition...</p>
              ) : (
                <div className="border rounded p-3 bg-gray-50 overflow-auto h-[70vh]">
                  <h3 className="font-semibold text-blue-700 mb-3 text-center">
                    {viewOnlyEnv} Definition
                  </h3>
                  <pre className="text-sm whitespace-pre-wrap text-gray-800">
                    {viewOnlyDefinition}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lists */}
        <div className="grid grid-cols-3 gap-1 mt-4 text-sm">
          <DiffColumn title={`Only in ${envA?.name} (${uniqueA.length})`} color="blue" items={uniqueA}  onClick={(fnName) => handleViewOnly(fnName, envA, envA?.name)}/>
          <DiffColumn
            title={`Common Functions (${commonFunctions.length})`}
            color="green"
            items={commonFunctions}
            onClick={handleCompare}
            selected={selectedFunction}
          />
          <DiffColumn title={`Only in ${envB?.name} (${uniqueB.length})`} color="blue" items={uniqueB} onClick={(fnName) => handleViewOnly(fnName, envB, envB?.name)} />
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
