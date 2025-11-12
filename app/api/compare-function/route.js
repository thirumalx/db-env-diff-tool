import mysql from "mysql2/promise";
import { Client } from "pg";

export async function POST(req) {
  try {
    const body = await req.json();
    const { dbType, host, port, user, password, schema, routineName } = body;

    let data;
    console.log(`Connecting to ${dbType} database at ${host}:${port} as ${user}`);
    if (dbType === "MySQL") {
      const conn = await mysql.createConnection({ host, port, user, password });

      const query = `
        SELECT ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_SCHEMA = ? 
          AND ROUTINE_NAME = ? 
          AND ROUTINE_TYPE IN ('FUNCTION','PROCEDURE')
      `;

      const [rows] = await conn.execute(query, [schema, routineName]);
      await conn.end();

      data = rows?.[0]?.ROUTINE_DEFINITION || null

    } else if (dbType === "PostgreSQL") {
      const client = new Client({ host, port, user, password, database: "postgres" });
      await client.connect();

      const query = `
        SELECT pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = $1
          AND n.nspname NOT IN ('pg_catalog', 'information_schema');
      `;

      const result = await client.query(query, [routineName]);
      await client.end();

      data = result.rows?.[0]?.definition || null;
    } else {
      return new Response(JSON.stringify({ error: `Unsupported DB type ${dbType}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error fetching data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
