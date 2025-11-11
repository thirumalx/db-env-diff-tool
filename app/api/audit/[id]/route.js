// GET /api/audit/:id
import  dbPromise  from "@/lib/db";

export async function GET(req, context) {
  const { id } = await context.params;   // 👈 await params

  try {
    const db = await dbPromise;
    const log = await db.get(
      `SELECT a.*, u.name AS executed_by 
       FROM audit_log AS a 
       LEFT JOIN users AS u ON u.id = a.user_id 
       WHERE a.id = ?`,
      [id]
    );

    if (!log) {
      return new Response(JSON.stringify({ error: "Log not found" }), {
        status: 404,
      });
    }

    return Response.json(log);
  } catch (err) {
    console.error("Error fetching audit log:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

// POST /api/audit/:id (rollback)
export async function POST(req, context) {
  const { id } = await context.params;   // 👈 await params

  try {
    const db = await dbPromise;

    const log = await db.get(`SELECT * FROM audit_log WHERE id = ?`, [id]);
    if (!log) {
      return new Response(JSON.stringify({ error: "Log not found" }), {
        status: 404,
      });
    }

    // rollback logic goes here…

    return Response.json({ message: `Rollback successful for log ${id}` });
  } catch (err) {
    console.error("Error rolling back audit log:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
