import { loadEnvFile } from "node:process";
try { loadEnvFile(); } catch (e) {}

import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  const args = process.argv.slice(2);

  if (args.includes("--list") || args.length === 0) {
    const res = await client.query(`
      SELECT r.id, r.user_id, u.name as account_name, r.user_name as payee_name, r.upi_id, r.amount_inr, r.cost as coins, r.status, r.admin_notes, r.redeemed_at
      FROM public.user_redeem_data r
      LEFT JOIN public.users u ON r.user_id = u.id
      ORDER BY r.redeemed_at DESC
      LIMIT 20;
    `);
    console.log("=== Recent Redeem Requests ===");
    console.table(res.rows);
    console.log("\nUsage to update status:");
    console.log("  node scripts/admin_update_redeem.js <id> <status: completed|approved|rejected|pending> [notes]");
  } else {
    const id = parseInt(args[0], 10);
    const status = args[1]?.toLowerCase() || "completed";
    const notes = args.slice(2).join(" ") || `Processed by admin on ${new Date().toISOString()}`;

    const res = await client.query(
      `UPDATE public.user_redeem_data SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, notes, id]
    );

    if (res.rows.length === 0) {
      console.log(`No redeem request found with ID ${id}`);
    } else {
      console.log(`Successfully updated request #${id} to '${status}':`, res.rows[0]);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
