import { prisma } from './db'

interface RecordAuditArgs {
  userId?: string | null      // who performed the change
  action: string              // e.g. "update", "create", "delete", "approve_role"
  module: string              // e.g. "profile", "members", "activities", "roles"
  entityType?: string | null  // e.g. "User", "MemberActivity", "MemberRoleRequest"
  entityId?: string | null
  details?: string | null
  before?: unknown            // previous state (object) — will be JSON-stringified
  after?: unknown             // new state (object) — will be JSON-stringified
  ipAddress?: string | null
}

/**
 * Persist an audit log entry. Computes a minimal diff when both `before` and
 * `after` are provided so we only record what actually changed.
 */
export async function recordAudit(args: RecordAuditArgs): Promise<void> {
  let previousValue: string | null = null
  let newValue: string | null = null

  if (args.before !== undefined && args.after !== undefined && isPlainObject(args.before) && isPlainObject(args.after)) {
    const { before, after } = diffObjects(args.before as Record<string, unknown>, args.after as Record<string, unknown>)
    previousValue = Object.keys(before).length > 0 ? safeStringify(before) : null
    newValue = Object.keys(after).length > 0 ? safeStringify(after) : null
  } else {
    if (args.before !== undefined) previousValue = safeStringify(args.before)
    if (args.after !== undefined) newValue = safeStringify(args.after)
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: args.userId ?? null,
        action: args.action,
        module: args.module,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
        details: args.details ?? null,
        previousValue,
        newValue,
        ipAddress: args.ipAddress ?? null,
      },
    })
  } catch (e) {
    // Never let audit failures break the parent request.
    console.error('[audit] failed to write entry:', e)
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
}

/**
 * Returns only the keys whose values differ between `before` and `after`.
 * Comparison is done via JSON.stringify so nested objects/arrays work.
 */
function diffObjects(before: Record<string, unknown>, after: Record<string, unknown>) {
  const beforeOut: Record<string, unknown> = {}
  const afterOut: Record<string, unknown> = {}
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    const b = before[k]
    const a = after[k]
    if (safeStringify(b) !== safeStringify(a)) {
      beforeOut[k] = b ?? null
      afterOut[k] = a ?? null
    }
  }
  return { before: beforeOut, after: afterOut }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/** Derive a request's IP for the audit trail. */
export function getRequestIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}
