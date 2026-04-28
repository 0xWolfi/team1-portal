import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError, isSuperAdmin } from '@/lib/auth'
import { bulkImportSchema } from '@/lib/validations'
import { recordAudit, getRequestIp } from '@/lib/audit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RowOutcome = {
  email: string
  region: string
  status: 'imported' | 'skipped'
  reason?: string
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)
    if (!isSuperAdmin(user)) return apiError('Forbidden', 403)

    const body = await request.json().catch(() => null)
    const parsed = bulkImportSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.errors[0]
      const tooMany = first?.code === 'too_big'
      return apiError(tooMany ? 'Too many rows (max 500)' : (first?.message || 'Invalid request'), 400)
    }

    const inputRows = parsed.data.rows

    const regions = await prisma.region.findMany({
      select: { id: true, name: true, slug: true, isActive: true },
    })
    const regionByKey = new Map<string, { id: string; name: string; slug: string; isActive: boolean }>()
    for (const r of regions) {
      regionByKey.set(r.name.toLowerCase(), r)
      regionByKey.set(r.slug.toLowerCase(), r)
    }

    const emails = Array.from(new Set(inputRows.map((r) => r.email).filter((e) => EMAIL_RE.test(e))))
    const existingUsers = emails.length
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: {
            id: true,
            email: true,
            displayName: true,
            memberships: { select: { regionId: true } },
          },
        })
      : []
    const userByEmail = new Map<
      string,
      { id: string; email: string; displayName: string; memberships: { regionId: string }[] }
    >()
    for (const u of existingUsers) userByEmail.set(u.email, u)

    const results: RowOutcome[] = []
    const importedUserRegionPairs: { userId: string; userEmail: string; userDisplayName: string; regionId: string; regionName: string; created: boolean }[] = []

    for (const row of inputRows) {
      const email = row.email
      const regionInput = row.region

      if (!email || !EMAIL_RE.test(email)) {
        results.push({ email, region: regionInput, status: 'skipped', reason: 'Invalid email' })
        continue
      }
      if (!regionInput) {
        results.push({ email, region: regionInput, status: 'skipped', reason: `Unknown region: '${regionInput}'` })
        continue
      }

      const region = regionByKey.get(regionInput.toLowerCase())
      if (!region) {
        results.push({ email, region: regionInput, status: 'skipped', reason: `Unknown region: '${regionInput}'` })
        continue
      }

      const existing = userByEmail.get(email)

      if (existing) {
        const alreadyInRegion = existing.memberships.some((m) => m.regionId === region.id)
        if (alreadyInRegion) {
          results.push({ email, region: regionInput, status: 'skipped', reason: `Already in ${region.name}` })
          continue
        }
        try {
          await prisma.userRegionMembership.create({
            data: {
              userId: existing.id,
              regionId: region.id,
              role: 'member',
              status: 'accepted',
              isPrimary: false,
            },
          })
          existing.memberships.push({ regionId: region.id })
          results.push({ email, region: regionInput, status: 'imported' })
          importedUserRegionPairs.push({
            userId: existing.id,
            userEmail: existing.email,
            userDisplayName: existing.displayName,
            regionId: region.id,
            regionName: region.name,
            created: false,
          })
        } catch {
          results.push({ email, region: regionInput, status: 'skipped', reason: `Already in ${region.name}` })
        }
        continue
      }

      try {
        const displayName = email.split('@')[0]
        const created = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              displayName,
              emailVerified: false,
              isActive: true,
              status: 'active',
            },
          })
          await tx.userRegionMembership.create({
            data: {
              userId: newUser.id,
              regionId: region.id,
              role: 'member',
              status: 'accepted',
              isPrimary: false,
            },
          })
          return newUser
        })
        userByEmail.set(email, {
          id: created.id,
          email: created.email,
          displayName: created.displayName,
          memberships: [{ regionId: region.id }],
        })
        results.push({ email, region: regionInput, status: 'imported' })
        importedUserRegionPairs.push({
          userId: created.id,
          userEmail: created.email,
          userDisplayName: created.displayName,
          regionId: region.id,
          regionName: region.name,
          created: true,
        })
      } catch {
        results.push({ email, region: regionInput, status: 'skipped', reason: 'Failed to create user' })
      }
    }

    const importedCount = importedUserRegionPairs.length
    const ip = getRequestIp(request)

    for (const p of importedUserRegionPairs) {
      try {
        await recordAudit({
          userId: user.id,
          action: 'bulk_import',
          module: 'members',
          entityType: 'user',
          entityId: p.userId,
          details: `Imported into ${p.regionName} as member`,
          after: { email: p.userEmail, region: p.regionName, role: 'member' },
          ipAddress: ip,
        })
      } catch {}
    }

    if (importedCount > 0) {
      try {
        await recordAudit({
          userId: user.id,
          action: 'bulk_import_summary',
          module: 'members',
          entityType: 'user',
          details: `Bulk CSV import: ${importedCount} imported, ${results.length - importedCount} skipped`,
          after: { total: results.length, imported: importedCount, skipped: results.length - importedCount },
          ipAddress: ip,
        })
      } catch {}

      try {
        const admins = await prisma.platformAdmin.findMany({
          where: { role: { in: ['super_admin', 'community_ops'] } },
          select: { userId: true },
        })
        const recipients = admins.map((a) => a.userId).filter((id) => id !== user.id)
        if (recipients.length > 0) {
          await prisma.notification.createMany({
            data: recipients.map((uid) => ({
              userId: uid,
              title: 'CSV Import',
              message: `${importedCount} members imported via CSV by ${user.displayName}.`,
              type: 'info',
              link: '/admin/members',
            })),
          })
        }
      } catch {}
    }

    const skippedCount = results.length - importedCount
    return apiSuccess({
      summary: {
        total: results.length,
        imported: importedCount,
        skipped: skippedCount,
        results,
      },
    })
  } catch (e) {
    return apiError('Internal server error', 500)
  }
}
