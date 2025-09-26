import { Pool } from 'pg'

const pool = new Pool({
  user: 'kratos',
  password: 'secret',
  host: 'localhost',
  port: 5432,
  database: 'kratos',
})

export async function getUsers() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        id, 
        schema_id, 
        traits, 
        created_at, 
        updated_at 
      FROM identities 
      ORDER BY created_at DESC
    `)
    return result.rows
  } finally {
    client.release()
  }
}

export async function getUserSessions() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        s.id,
        s.identity_id,
        s.created_at,
        s.expires_at,
        i.traits->>'email' as email
      FROM sessions s
      JOIN identities i ON s.identity_id = i.id
      WHERE s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `)
    return result.rows
  } finally {
    client.release()
  }
}

export default pool
