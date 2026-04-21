import { prisma } from '@/lib/db'
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth'
import { z } from 'zod'

const rosterEntrySchema = z.object({
  email: z.string().email().optional(),
  xHandle: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
})

const rosterBulkSchema = z.object({
  entries: z.array(rosterEntrySchema).max(100, 'Maximum 100 entries per batch'),
})

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)
    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { xHandle: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.memberRoster.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.memberRoster.count({ where }),
    ])

    return apiSuccess({ items, total })
  } catch (e: any) {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)
    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const body = await request.json()

    // Single add
    if (body.email || body.xHandle) {
      const parsed = rosterEntrySchema.safeParse(body)
      if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

      const email = parsed.data.email?.toLowerCase().trim() || null
      const xHandle = parsed.data.xHandle?.replace('@', '').trim() || null

      if (!email && !xHandle) {
        return apiError('Email or X handle is required')
      }

      // Check duplicate
      if (email) {
        const existing = await prisma.memberRoster.findUnique({ where: { email } })
        if (existing) return apiError('This email is already in the roster')
      }

      const entry = await prisma.memberRoster.create({
        data: {
          email,
          xHandle,
          name: parsed.data.name?.trim() || null,
          addedById: user.id,
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'roster_add',
          module: 'roster',
          entityType: 'MemberRoster',
          entityId: entry.id,
          details: `Added ${email || xHandle} to roster`,
        },
      })

      return apiSuccess(entry)
    }

    // Bulk import (array of { email, xHandle, name })
    if (Array.isArray(body.entries)) {
      const bulkParsed = rosterBulkSchema.safeParse(body)
      if (!bulkParsed.success) return apiError(bulkParsed.error.errors[0].message, 422)

      const entries = bulkParsed.data.entries
      let added = 0
      let skipped = 0

      for (const entry of entries) {
        const email = entry.email?.toLowerCase().trim() || null
        const xHandle = entry.xHandle?.replace('@', '').trim() || null

        if (!email && !xHandle) {
          skipped++
          continue
        }

        try {
          if (email) {
            const existing = await prisma.memberRoster.findUnique({ where: { email } })
            if (existing) { skipped++; continue }
          }

          await prisma.memberRoster.create({
            data: {
              email,
              xHandle,
              name: entry.name?.trim() || null,
              addedById: user.id,
            },
          })
          added++
        } catch {
          skipped++
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'roster_bulk_import',
          module: 'roster',
          details: `Bulk imported ${added} entries, ${skipped} skipped`,
        },
      })

      return apiSuccess({ added, skipped, total: added + skipped })
    }

    return apiError('Invalid request body')
  } catch (e: any) {
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return apiError('Unauthorized', 401)
    const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
    if (!admin) return apiError('Forbidden', 403)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return apiError('ID is required')

    const entry = await prisma.memberRoster.findUnique({ where: { id } })
    if (!entry) return apiError('Not found', 404)

    await prisma.memberRoster.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'roster_remove',
        module: 'roster',
        entityType: 'MemberRoster',
        entityId: id,
        details: `Removed ${entry.email || entry.xHandle} from roster`,
      },
    })

    return apiSuccess({ deleted: true })
  } catch (e: any) {
    return apiError('Internal server error', 500)
  }
}
