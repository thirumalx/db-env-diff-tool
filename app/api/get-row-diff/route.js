import mysql from "mysql2/promise";
import { Client } from "pg";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      dbType,
      host,
      port,
      db,
      user,
      password,
      table,
      whereColumn,
      whereValue
    } = body;

    let data, count;

    // Check if WHERE clause should be applied
    const hasWhere =
      whereColumn && whereColumn.trim() !== "" &&
      whereValue !== undefined && whereValue !== null;

    if (dbType === "MySQL") {
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database: db
      });

      let query = `SELECT * FROM \`${table}\``;
      let countQuery = `SELECT COUNT(*) AS cnt FROM \`${table}\``;
      let params = [];

      if (hasWhere) {
        query += ` WHERE \`${whereColumn}\` = ?`;
        countQuery += ` WHERE \`${whereColumn}\` = ?`;
        params.push(whereValue);
      }

      const [rows] = await conn.execute(query, params);
      const [countRes] = await conn.execute(countQuery, params);

      await conn.end();

      data = rows;
      count = countRes[0].cnt;

    } else if (dbType === "PostgreSQL") {
      const client = new Client({
        host,
        port,
        user,
        password,
        database: db
      });

      await client.connect();

      let query = `SELECT * FROM "${table}"`;
      let countQuery = `SELECT COUNT(*) AS cnt FROM "${table}"`;
      let params = [];

      if (hasWhere) {
        query += ` WHERE "${whereColumn}" = $1`;
        countQuery += ` WHERE "${whereColumn}" = $1`;
        params.push(whereValue);
      }

      const result = await client.query(query, params);
      const countResult = await client.query(countQuery, params);

      await client.end();

      data = result.rows;
      count = Number(countResult.rows[0].cnt);

    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported DB type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Total data fetched:", count);

    return new Response(
      JSON.stringify({ data, count }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
