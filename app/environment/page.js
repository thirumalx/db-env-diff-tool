"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "../context/DbContext";
import TopNav from "../components/TopNav"; 

export default function Home() {
  const router = useRouter();
  const { payload, setPayload } = useDb();
  const [dbType, setDbType] = useState(payload.dbType);
  const [envA, setEnvA] = useState(payload.envA);
  const [envB, setEnvB] = useState(payload.envB);
  const [savedEnvs, setSavedEnvs] = useState([]); // 🔹 store environments from DB

  // Load from DB on mount
  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/environment");
      const data = await res.json();
      if (Array.isArray(data)) {
        // DB has environments → use them
        setSavedEnvs(data);
        // If user already had EnvA/EnvB selected, hydrate from DB
        if (envA?.name) {
          const dbEnvA = data.find(env => env.name === envA.name);
          if (dbEnvA) {
            setEnvA({
              name: dbEnvA.name,
              host: dbEnvA.host,
              port: dbEnvA.port,
              db: dbEnvA.db_name,
              user: dbEnvA.user,
              password: dbEnvA.password,
            });
          }
        }
        if (envB?.name) {
          const dbEnvB = data.find(env => env.name === envB.name);
          if (dbEnvB) {
            setEnvB({
              name: dbEnvB.name,
              host: dbEnvB.host,
              port: dbEnvB.port,
              db: dbEnvB.db_name,
              user: dbEnvB.user,
              password: dbEnvB.password,
            });
          }
        }
      } else if (data?.dbType) {
        // backward compatibility with old shape
        setDbType(data.dbType);
        setEnvA(JSON.parse(data.envA));
        setEnvB(JSON.parse(data.envB));
        setPayload({ dbType: data.dbType, envA: JSON.parse(data.envA), envB: JSON.parse(data.envB) });
      } else {
      // No DB record → fallback to payload/env defaults
      setPayload({ dbType, envA, envB });
    }
    };
    loadData();
  }, []);

  const handleGetTables = async () => {
    const newPayload = { dbType, envA, envB };
    setPayload(newPayload); // Store in context
    console.log("Payload is ", newPayload);
    // Save to SQLite
    await fetch("/api/environment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPayload),
    });
    router.push(`/diff-db`);
  };

  const handleGetFunctions = async () => {
    const newPayload = { dbType, envA, envB };
    setPayload(newPayload); // Store in context
    console.log("Payload is ", newPayload);
    // Save to SQLite
    await fetch("/api/environment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPayload),
    });
    router.push(`/diff-function`);
  };

  //Keep context live-updated
  useEffect(() => {
     setPayload({ dbType, envA, envB });
  }, [dbType, envA, envB]);


  return (
   <div className="font-sans">
     <TopNav title="Environment Setup" />  
     <div className="mb-2 flex items-center gap-6">
         {/* Label on the same line */}
        <label className="font-medium" htmlFor="dbType">
          Select Database:
        </label>
         {/* Options */}
        <div className="flex gap-6">
          {/* PostgreSQL Option */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="dbType"
              value="PostgreSQL"
              checked={dbType === "PostgreSQL"}
              onChange={e => setDbType(e.target.value)}
              className="accent-indigo-600"
            />
            <img
              src="/icons/postgresql.svg"
              alt="PostgreSQL"
              className="w-35 h-10"
            />
          </label>

          {/* MySQL Option */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="dbType"
              value="MySQL"
              checked={dbType === "MySQL"}
              onChange={e => setDbType(e.target.value)}
              className="accent-indigo-600"
            />
            <img
              src="/icons/mysql.svg"
              alt="MySQL"
              className="w-20 h-10"
            />
          </label>
        </div>
      </div>
      <hr />
      <div className="flex flex-col md:flex-row gap-12">
        <div  className="p-3 flex-1">
          <h2 className="text-lg font-semibold mb-4 text-center bg-blue-200">Environment A</h2>
          {/* Dropdown for Env A */}
          <select
            className="w-full border border-gray-300 rounded px-3 py-1 mb-4"
            value={envA?.name || ""}
            onChange={(e) => {
              const selected = savedEnvs.find(env => env.name === e.target.value);
              if (selected) {
                setEnvA({
                  name: selected.name,
                  host: selected.host,
                  port: selected.port,
                  db: selected.db_name,
                  user: selected.user,
                  password: selected.password,
                });
              }
            }}
          >
            <option value="">-- Select Environment A --</option>
            {savedEnvs.map((env) => (
              <option
                key={env.id}
                value={env.name}
                disabled={envB?.name === env.name} // disable if EnvB already selected
              >
                {env.name}
              </option>
            ))}
          </select>

          {renderEnvInputs(envA, setEnvA, "envA")}
        </div>
        <div  className="p-3 flex-1">
          <h2 className="text-lg font-semibold mb-4 text-center bg-blue-200">Environment B</h2>
          {/* Dropdown for Env B */}
          <select
            className="w-full border border-gray-300 rounded px-3 py-1 mb-4"
            value={envB?.name || ""}
            onChange={(e) => {
              const selected = savedEnvs.find(env => env.name === e.target.value);
              if (selected) {
                setEnvB({
                  name: selected.name,
                  host: selected.host,
                  port: selected.port,
                  db: selected.db_name,
                  user: selected.user,
                  password: selected.password,
                });
              }
            }}
          >
            <option value="">-- Select Environment B --</option>
            {savedEnvs.map((env) => (
              <option
                key={env.id}
                value={env.name}
                disabled={envA?.name === env.name} // disable if EnvA already selected
              >
                {env.name}
              </option>
            ))}
          </select>

          {renderEnvInputs(envB, setEnvB, "envB")}
        </div>
      </div>
      <div className="flex justify-end mt-2 gap-3">
         <button 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => {
            console.log("Selected DB Type:", dbType);
            console.log("Env A:", envA);
            console.log("Env B:", envB);
            handleGetFunctions();
          }}
        >
        Display Functions
        </button>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => {
            console.log("Selected DB Type:", dbType);
            console.log("Env A:", envA);
            console.log("Env B:", envB);
            handleGetTables();
          }}
        >
        Display Tables
        </button>
      </div>
   </div>
  );
}

function renderEnvInputs(env, setEnv, prefix) {
  const fields = [
    { name: "name", label: "Environment Name" },
    { name: "host", label: "Host / IP" },
    { name: "port", label: "Port" },
    { name: "db", label: "Database Name" },
    { name: "user", label: "Username" },
    { name: "password", label: "Password", type: "password" },
  ];

  return fields.map((field) => (
    <div key={field.name} className="flex items-center mb-4">
      <label
        htmlFor={`${prefix}-${field.name}`}
        className="w-40 font-medium text-gray-700"
      >
        {field.label}
      </label>
      <input
        id={`${prefix}-${field.name}`}
        type={field.type || "text"}
        placeholder={field.label}
        value={env[field.name]}
        onChange={(e) =>
          setEnv((prev) => ({ ...prev, [field.name]: e.target.value }))
        }
        className="flex-1 border border-gray-300 rounded px-3 py-1"
      />
    </div>
  ));
}

