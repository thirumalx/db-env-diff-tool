"use client";

import { useEffect, useState } from "react";
import { useDb } from "../context/DbContext";
import TopNav from "../components/TopNav";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css"; // Required default styles

import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-sql"

export default function DiffFunctionPage() {
  const { payload } = useDb(); // ✅ from context
  const { dbType, envA, envB } = payload || {};
  const [commonFunctions, setCommonFunctions] = useState([]);
  const [uniqueA, setUniqueA] = useState([]);
  const [uniqueB, setUniqueB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [diffText, setDiffText] = useState(""); // unified diff text
  const [diffLoading, setDiffLoading] = useState(false);
  const [definitionA, setDefinitionA] = useState("");
  const [definitionB, setDefinitionB] = useState("");


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

      // Create a unified diff text
      const unifiedDiff = generateUnifiedDiff(definitionA, definitionB, fnName, envA.name, envB.name);
      setDiffText(unifiedDiff);


    } catch (e) {
      console.error("Compare failed:", e);
      setDiffText("❌ Error fetching function definitions.");
    } finally {
      setDiffLoading(false);
    }
  }

  // Simple unified diff generator
function generateUnifiedDiff(a, b, fnName, envA, envB) {
  const DiffLib = require("diff");

  // If definitions are the same (ignoring whitespace differences)
  if (a.trim() === b.trim()) {
    return `diff --git a/${fnName} b/${fnName}
    --- a/${envA}
    +++ b/${envB}
    @@ -0,0 +0,0 @@
    No difference found`;
  }
  // Let diff library produce valid unified diff (don't slice headers)
  return DiffLib.createTwoFilesPatch(envA, envB, a, b, "", "");
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
                      <DiffView diffText={diffText} />
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
            title={`Common Functions (${commonFunctions.length})`}
            color="green"
            items={commonFunctions}
            onClick={handleCompare}
            selected={selectedFunction}
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

/** Renders a diff using react-diff-view */
function DiffView({ diffText }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!diffText) return;

    try {
      const parsed = parseDiff(diffText);
      setFiles(parsed);
    } catch (err) {
      console.warn("parseDiff failed:", err);
      setFiles([]);
    }

    Prism.highlightAll();
  }, [diffText]);

  // Explicit check for "No difference found"
  if (diffText.includes("No difference found")) {
    return (
      <pre className="bg-green-50 text-green-700 p-4 rounded text-center whitespace-pre-wrap">
        ✅ No difference found between environments.
      </pre>
    );
  }

  // If no parsed hunks, show fallback
  if (!files.length) {
    return (
      <pre className="bg-gray-50 text-gray-700 p-4 rounded overflow-auto whitespace-pre-wrap">
        ⚠️ Unable to generate diff. Check definitions.
      </pre>
    );
  }
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
