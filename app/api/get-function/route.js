import mysql from "mysql2/promise";
import { Client } from "pg";

export async function POST(req) {
  try {
    const body = await req.json();
    const { dbType, host, port, user, password } = body;

    let data = [];
    let count = 0;
    console.log(`Connecting to ${dbType} database at ${host}:${port} as ${user}`);
    if (dbType === "MySQL") {
      const conn = await mysql.createConnection({ host, port, user, password });

      const [rows] = await conn.execute(`
        SELECT ROUTINE_SCHEMA AS db_name,
               ROUTINE_NAME AS routine_name,
               ROUTINE_TYPE AS routine_type,
               DATA_TYPE AS return_type,
               CREATED,
               LAST_ALTERED
        FROM INFORMATION_SCHEMA.ROUTINES
        ORDER BY ROUTINE_SCHEMA, ROUTINE_TYPE, ROUTINE_NAME;
      `);

      const [countRes] = await conn.execute(`SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.ROUTINES;`);

      await conn.end();

      data = rows;
      count = countRes[0].cnt;

    } else if (dbType === "PostgreSQL") {
      const client = new Client({ host, port, user, password, database: "postgres" });
      await client.connect();

      const result = await client.query(`
        SELECT routine_catalog AS db_name,
               routine_schema,
               routine_name,
               routine_type,
               data_type AS return_type,
               created,
               last_altered
        FROM information_schema.routines
        WHERE specific_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY routine_schema, routine_name;
      `);

      const countResult = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM information_schema.routines
        WHERE specific_schema NOT IN ('pg_catalog', 'information_schema');
      `);

      await client.end();

      data = result.rows;
      count = Number(countResult.rows[0].cnt);
    } else {
      return new Response(JSON.stringify({ error: `Unsupported DB type ${dbType}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`✅ ${dbType}: Total routines = ${count}`);

    return new Response(JSON.stringify({ data, count }), {
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
