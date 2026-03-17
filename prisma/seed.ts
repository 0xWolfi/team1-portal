import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  const hash = await bcrypt.hash('Admin@123', 12)
  const leadHash = await bcrypt.hash('Lead@123', 12)
  const memberHash = await bcrypt.hash('Member@123', 12)
  const userHash = await bcrypt.hash('User@123', 12)

  // Create regions
  const regions = await Promise.all([
    prisma.region.create({ data: { name: 'India', slug: 'india', country: 'India', description: 'Indian Avalanche community hub covering all states.', isActive: true, sortOrder: 1 } }),
    prisma.region.create({ data: { name: 'United States', slug: 'united-states', country: 'United States', description: 'US Avalanche community across all states.', isActive: true, sortOrder: 2 } }),
    prisma.region.create({ data: { name: 'Nigeria', slug: 'nigeria', country: 'Nigeria', description: 'Nigerian Avalanche community hub.', isActive: true, sortOrder: 3 } }),
    prisma.region.create({ data: { name: 'Turkey', slug: 'turkey', country: 'Turkey', description: 'Turkish Avalanche community hub.', isActive: true, sortOrder: 4 } }),
    prisma.region.create({ data: { name: 'Spain', slug: 'spain', country: 'Spain', description: 'Spanish Avalanche community hub.', isActive: true, sortOrder: 5 } }),
    prisma.region.create({ data: { name: 'Brazil', slug: 'brazil', country: 'Brazil', description: 'Brazilian Avalanche community hub.', isActive: true, sortOrder: 6 } }),
  ])

  const [india, us, nigeria, turkey, spain, brazil] = regions

  // Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@team1.network',
      passwordHash: hash,
      displayName: 'Super Admin',
      username: 'superadmin',
      emailVerified: true,
    },
  })
  await prisma.platformAdmin.create({ data: { userId: admin.id, role: 'super_admin' } })

  // Country Leads
  const leadIndia = await prisma.user.create({
    data: { email: 'lead.india@team1.network', passwordHash: leadHash, displayName: 'India Lead', username: 'lead_india', emailVerified: true },
  })
  const leadUS = await prisma.user.create({
    data: { email: 'lead.us@team1.network', passwordHash: leadHash, displayName: 'US Lead', username: 'lead_us', emailVerified: true },
  })
  const leadNigeria = await prisma.user.create({
    data: { email: 'lead.nigeria@team1.network', passwordHash: leadHash, displayName: 'Nigeria Lead', username: 'lead_nigeria', emailVerified: true },
  })

  // Assign leads to regions
  await prisma.userRegionMembership.createMany({
    data: [
      { userId: leadIndia.id, regionId: india.id, role: 'lead', status: 'accepted', isPrimary: true },
      { userId: leadUS.id, regionId: us.id, role: 'lead', status: 'accepted', isPrimary: true },
      { userId: leadNigeria.id, regionId: nigeria.id, role: 'lead', status: 'accepted', isPrimary: true },
    ],
  })

  // Members
  const member1 = await prisma.user.create({
    data: { email: 'member1@team1.network', passwordHash: memberHash, displayName: 'Ravi Kumar', username: 'ravi_kumar', emailVerified: true, bio: 'Web3 developer from India' },
  })
  const member2 = await prisma.user.create({
    data: { email: 'member2@team1.network', passwordHash: memberHash, displayName: 'Sarah Johnson', username: 'sarah_j', emailVerified: true, bio: 'Community builder from US' },
  })
  const member3 = await prisma.user.create({
    data: { email: 'member3@team1.network', passwordHash: memberHash, displayName: 'Emeka Obi', username: 'emeka_obi', emailVerified: true, bio: 'Blockchain enthusiast from Nigeria' },
  })
  const member4 = await prisma.user.create({
    data: { email: 'member4@team1.network', passwordHash: memberHash, displayName: 'Priya Sharma', username: 'priya_s', emailVerified: true, bio: 'DeFi researcher from India' },
  })

  // Assign members to regions
  await prisma.userRegionMembership.createMany({
    data: [
      { userId: member1.id, regionId: india.id, role: 'member', status: 'accepted', isPrimary: true },
      { userId: member2.id, regionId: us.id, role: 'member', status: 'accepted', isPrimary: true },
      { userId: member3.id, regionId: nigeria.id, role: 'member', status: 'accepted', isPrimary: true },
      { userId: member4.id, regionId: india.id, role: 'member', status: 'accepted', isPrimary: true },
      { userId: member1.id, regionId: us.id, role: 'member', status: 'accepted', isPrimary: false },
    ],
  })

  // Non-member user (for testing apply flow)
  await prisma.user.create({
    data: { email: 'newuser@team1.network', passwordHash: userHash, displayName: 'New User', username: 'newuser', emailVerified: true },
  })

  // Super admin gets membership to all regions
  await prisma.userRegionMembership.createMany({
    data: regions.map((r, i) => ({ userId: admin.id, regionId: r.id, role: 'member', status: 'accepted', isPrimary: i === 0 })),
  })

  console.log('Seed complete!')
  console.log('')
  console.log('Test Credentials:')
  console.log('─────────────────────────────────────────')
  console.log('Super Admin:   admin@team1.network / Admin@123')
  console.log('India Lead:    lead.india@team1.network / Lead@123')
  console.log('US Lead:       lead.us@team1.network / Lead@123')
  console.log('Nigeria Lead:  lead.nigeria@team1.network / Lead@123')
  console.log('Member (IN):   member1@team1.network / Member@123')
  console.log('Member (US):   member2@team1.network / Member@123')
  console.log('Member (NG):   member3@team1.network / Member@123')
  console.log('Member (IN):   member4@team1.network / Member@123')
  console.log('Non-member:    newuser@team1.network / User@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
