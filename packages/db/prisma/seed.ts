import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding database...')

  // Default groups
  const adminGroup = await prisma.group.upsert({
    where: { id: 'group-administrators' },
    update: {},
    create: {
      id: 'group-administrators',
      name: 'Administrators',
      permissions: {
        'manage:system': true,
        'manage:users': true,
        'manage:groups': true,
        'manage:navigation': true,
        'manage:pages': true,
        'manage:assets': true,
        'read:pages': true,
        'write:pages': true,
        'delete:pages': true,
      },
    },
  })

  await prisma.group.upsert({
    where: { id: 'group-guests' },
    update: {},
    create: {
      id: 'group-guests',
      name: 'Guests',
      permissions: {
        'read:pages': true,
      },
    },
  })

  await prisma.group.upsert({
    where: { id: 'group-editors' },
    update: {},
    create: {
      id: 'group-editors',
      name: 'Editors',
      permissions: {
        'read:pages': true,
        'write:pages': true,
        'manage:assets': true,
      },
    },
  })

  console.log('Created default groups')

  // Default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@court-wiki.local' },
    update: {},
    create: {
      email: 'admin@court-wiki.local',
      name: 'Administrator',
      passwordHash: hashPassword('changeme'),
      isAdmin: true,
      isActive: true,
    },
  })

  // Add admin to administrators group
  await prisma.groupUser.upsert({
    where: { userId_groupId: { userId: adminUser.id, groupId: adminGroup.id } },
    update: {},
    create: { userId: adminUser.id, groupId: adminGroup.id },
  })

  console.log(`Created admin user: admin@court-wiki.local (password: changeme)`)

  // Getting started page
  await prisma.page.upsert({
    where: { path: 'getting-started' },
    update: {},
    create: {
      path: 'getting-started',
      title: 'Getting Started',
      description: 'Welcome to Court Wiki — your team knowledge base.',
      content: `# Getting Started

Welcome to **Court Wiki** — a modern, self-hosted wiki for your team.

## Creating Pages

Click **New Page** in the top navigation to create your first page. Pages support Markdown with:

- **Tables**, task lists, and footnotes
- **Code blocks** with syntax highlighting
- **Math** via KaTeX (\`$E = mc^2$\`)
- **Diagrams** via Mermaid

## Navigation

Use the sidebar to browse pages, or use the search bar to find content instantly.

## Admin Panel

Visit [/admin](/admin) to manage users, groups, permissions, and site settings.

> **Default credentials**: \`admin@court-wiki.local\` / \`changeme\`
> Change your password immediately after first login.
`,
      contentType: 'MARKDOWN',
      locale: 'en',
      isPublished: true,
      isPrivate: false,
      authorId: adminUser.id,
    },
  })

  console.log('Created Getting Started page')
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
