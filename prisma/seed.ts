import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.guide.deleteMany()
  await prisma.program.deleteMany()
  await prisma.playbook.deleteMany()
  await prisma.membershipApplication.deleteMany()
  await prisma.userRegionMembership.deleteMany()
  await prisma.platformAdmin.deleteMany()
  await prisma.authSession.deleteMany()
  await prisma.user.deleteMany()
  await prisma.region.deleteMany()
  await prisma.memberRoster.deleteMany()

  // Create regions
  const regions = await Promise.all([
    prisma.region.create({ data: { name: 'India', slug: 'india', country: 'India', description: 'Indian Avalanche community hub covering all states.', isActive: true, sortOrder: 1 } }),
    prisma.region.create({ data: { name: 'United States', slug: 'united-states', country: 'United States', description: 'US Avalanche community across all states.', isActive: true, sortOrder: 2 } }),
    prisma.region.create({ data: { name: 'Nigeria', slug: 'nigeria', country: 'Nigeria', description: 'Nigerian Avalanche community hub.', isActive: true, sortOrder: 3 } }),
    prisma.region.create({ data: { name: 'Turkey', slug: 'turkey', country: 'Turkey', description: 'Turkish Avalanche community hub.', isActive: true, sortOrder: 4 } }),
    prisma.region.create({ data: { name: 'Spain', slug: 'spain', country: 'Spain', description: 'Spanish Avalanche community hub.', isActive: true, sortOrder: 5 } }),
    prisma.region.create({ data: { name: 'Brazil', slug: 'brazil', country: 'Brazil', description: 'Brazilian Avalanche community hub.', isActive: true, sortOrder: 6 } }),
  ])

  // Super Admins
  const adminEmails = [
    { email: 'sarnavo@team1.network', name: 'Sarnavo', username: 'sarnavo' },
    { email: 'systum877@gmail.com', name: 'Systum', username: 'systum' },
    { email: 'armin@team1.network', name: 'Armin', username: 'armin' },
    { email: 'ellio@team1.network', name: 'Ellio', username: 'ellio' },
    { email: 'antoine@team1.network', name: 'Antoine', username: 'antoine' },
    { email: 'luke@team1.network', name: 'Luke', username: 'luke' },
  ]

  for (const admin of adminEmails) {
    const user = await prisma.user.create({
      data: {
        email: admin.email,
        displayName: admin.name,
        username: admin.username,
        emailVerified: true,
      },
    })
    await prisma.platformAdmin.create({ data: { userId: user.id, role: 'super_admin' } })

    // Give super admin membership to all regions as lead
    await prisma.userRegionMembership.createMany({
      data: regions.map((r, i) => ({
        userId: user.id, regionId: r.id, role: 'lead' as const, status: 'accepted' as const, isPrimary: i === 0,
      })),
    })
  }

  // Add all admins to roster
  await prisma.memberRoster.createMany({
    data: adminEmails.map((a) => ({ email: a.email, name: a.name, isUsed: true })),
  })

  console.log('Seed complete!')
  console.log('')
  console.log('Super Admins:')
  console.log('─────────────────────────────────────────')
  adminEmails.forEach((a) => console.log(`  ${a.email}`))
  console.log('')
  console.log('All have full super_admin access + lead on all regions.')
  console.log('All @team1.network emails are auto-whitelisted at login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
