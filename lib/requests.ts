import { getSql } from "./db";
import type { ServiceRequest } from "./validation";

export type CreatedRequest = { id: string; createdAt: string };

export async function insertServiceRequest(input: ServiceRequest): Promise<CreatedRequest> {
  const sql = getSql();
  // Tagged template: every ${value} is sent as a bind parameter, never spliced into the SQL text.
  const [row] = await sql<{ id: string; created_at: Date }[]>`
    insert into service_requests (name, email, service, description)
    values (${input.name}, ${input.email}, ${input.service}, ${input.description})
    returning id, created_at
  `;
  return { id: row.id, createdAt: row.created_at.toISOString() };
}
