"use client";

import { useEffect, useState } from "react";
import { useDb } from "../context/DbContext";
import TopNav from "../components/TopNav";

export default function DiffFunctionPage() {
  const { payload } = useDb(); // ✅ from context
  const { dbType, envA, envB } = payload || {};
  const [functionsA, setFunctionsA] = useState([]);
  const [functionsB, setFunctionsB] = useState([]);
  const [commonFunctions, setCommonFunctions] = useState([]);
  const [uniqueA, setUniqueA] = useState([]);
  const [uniqueB, setUniqueB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!payload) return;

    async function fetchFunctions() {
      console.log(
        "Fetching functions for environments:",
        envA?.name,
        envB?.name
      );
      try {
        setLoading(true);
        setConnectionError(null);

        const [resA, resB] = await Promise.all([
          fetch("/api/diff-function", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envA }),
          }),
          fetch("/api/diff-function", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbType, ...envB }),
          }),
        ]);

        const dataA = await resA.json();
        const dataB = await resB.json();

        const funcNamesA =
          dataA.data?.map((f) => f.ROUTINE_NAME || f.routine_name) || [];
        const funcNamesB =
          dataB.data?.map((f) => f.ROUTINE_NAME || f.routine_name) || [];

        setFunctionsA(funcNamesA);
        setFunctionsB(funcNamesB);

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

  if (!payload)
    return <p className="p-4 text-gray-600">No environment selected.</p>;

  const renderContent = () => {
    if (loading) {
      return <p className="text-center text-gray-600 mt-8">Loading functions...</p>;
    }
    if (connectionError) {
      return <p className="text-center text-red-600 mt-8">{connectionError}</p>;
    }
    return (
      <div className="grid grid-cols-3 gap-1 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              Only in Environment A ({uniqueA.length})
            </h3>
            <ul className="border p-2 rounded h-[70vh] overflow-auto divide-y divide-gray-400 bg-white shadow-inner">
              {uniqueA.length ? (
                uniqueA.map((f) => <li key={f} className="py-2 px-2 hover:bg-blue-50 transition-colors cursor-default">{f}</li>)
              ) : (
                <p className="text-center text-gray-500 mt-4">None</p>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Common Functions ({commonFunctions.length})
            </h3>
            <ul className="border p-2 rounded h-[70vh] overflow-auto divide-y divide-green-400 bg-white shadow-inner">
              {commonFunctions.length ? (
                commonFunctions.map((f) => <li key={f} className="py-2 px-2 hover:bg-blue-50 transition-colors cursor-default">{f}</li>)
              ) : (
                <p className="text-center text-gray-500 mt-4">None</p>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              Only in Environment B ({uniqueB.length})
            </h3>
            <ul className="border p-2 rounded h-[70vh] overflow-auto divide-y divide-gray-400 bg-white shadow-inner">
              {uniqueB.length ? (
                uniqueB.map((f) => <li key={f} className="py-2 px-2 hover:bg-blue-50 transition-colors cursor-default">{f}</li>)
              ) : (
                <p className="text-center text-gray-500 mt-4">None</p>
              )}
            </ul>
          </div>
        </div>
    );
  };

  return (
    <div className="p-6 font-sans">
      <TopNav title="Functions Comparison" />
      {renderContent()}
    </div>
  );
}
