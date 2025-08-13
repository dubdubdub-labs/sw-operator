## Repository Overview

This turborepo is a collection of sample templates (apps) and shared packages (design system, auth, utils, etc.) that can be used to bootstrap new projects quickly. As such, we should be careful to follow a consistent structure, naming scheme, and write well-written, documented code. 


## SW CLI Integration
The code and filesystem of this monorepo will be read by the `sw` CLI tool (which you can learn more about in the `GUIDE.md` file) to help developers view, preview, and adopt code artifacts into their own projects from this repository. App templates are located in the `apps` directory, and shared packages are located in the `packages` directory. Templates may have dependencies on packages, and packages may have dependencies on other packages.

The `sw` CLI is driven off of the `sw.json` files in the root of each app or package. These files are used to describe the artifact, and are used by the `sw` CLI to help developers view, preview, and adopt code artifacts into their own projects from this repository.

Templates are entire working (but templated) applications. They may leave gaps in the codebase for the end developer to fill in, for quick customization. 
Packages are ATOMIC, REUSABLE code that can be used in any project. They should expose a clear, well-documented API, and be designed to be used in a variety of contexts. Pacakges may revolve around domain-specific concepts but should avoid being tightly coupled to a specific project.

Both templates and packages should follow a pre-planned strong organization and directory structure. We should avoid including stray code or documentation, and keep the codebase as clean as possible. You should think hard about how to organize and colocate new code.

When locating and organizing code, consider how it will be read and viewed by the `sw` CLI. You may even consider including example code in packages, to help developers understand how to use them (and expose them through the view field in the sw.json file).


### Creating sw.json Files

#### Philosophy

The `sw.json` file is your artifact's resume. It should provide enough information that developers can understand what your artifact does, how it fits into their stack, and what they're committing to before they copy it.

#### Location Requirements

- **Templates**: `apps/<template-name>/sw.json`
- **Packages**: `packages/<package-name>/sw.json`
- Must coexist with `package.json` in the artifact's root directory

#### Schema & Best Practices

```json
{
  "type": "template",
  "slug": "saas-starter",
  "name": "Production SaaS Starter",
  "description": "Full-featured SaaS template with multi-tenant auth, Stripe billing, admin dashboard, and email workflows. Built on Next.js 14 with App Router, Tailwind CSS, and PostgreSQL. Includes CI/CD setup and monitoring.",
  "tags": [
    "saas",
    "nextjs",
    "stripe",
    "postgresql",
    "multi-tenant",
    "production"
  ],
  "requiredEnv": [
    {
      "name": "DATABASE_URL",
      "description": "PostgreSQL connection string for main database",
      "example": "postgresql://user:pass@localhost:5432/myapp"
    }
  ],
  "view": [
    { "path": "README.md", "lines": "all" },
    { "path": "src/app/page.tsx", "lines": [1, 100] },
    { "path": "src/lib/auth/provider.tsx", "lines": [1, 80] },
    { "tree": { "path": "src", "depth": 3, "limit": 50 } },
    { "path": "package.json", "lines": [1, 40] }
  ]
}
```

#### Field Guidelines

**`description`** - Write 2-3 sentences that answer:

- What does this solve?
- What stack/technologies does it use?
- What makes it distinctive?

Bad: "Auth package"
Good: "Type-safe authentication package with JWT refresh tokens, OAuth providers (Google, GitHub), and React hooks. Includes session management, permission guards, and automatic token renewal."

**`tags`** - Include:

- Technology tags: `nextjs`, `react`, `vue`, `typescript`...
- Domain tags: `auth`, `billing`, `analytics`, `cms`...
- Architecture tags: `microservice`, `monolithic`, `serverless`...
- Maturity tags: `production`, `experimental`, `deprecated`...

Feel free to add other tags that you think are relevant.

**`view`** - Design for standalone understanding:

```json
"view": [
  // 1. Always include README for overview
  { "path": "README.md", "lines": [1, 150] },

  // 2. Show structure with a tree
  { "tree": { "path": "src", "depth": 3, "limit": 100 } },

  // 3. Show the main entry point or API surface
  { "path": "src/index.ts", "lines": "all" },

  // 4. Include a key implementation file
  { "path": "src/core/handler.ts", "lines": [1, 100] },
]
```

**Goal**: Someone should be able to understand 80% of your artifact's implementation from the view alone.

#### Examples of Well-Documented Artifacts

**Rich Template Example:**

```json
{
  "type": "template",
  "slug": "marketplace-platform",
  "name": "Multi-Vendor Marketplace Platform",
  "description": "Complete marketplace with vendor onboarding, product catalog, cart/checkout, payment splitting, and admin controls. Features real-time inventory, review system, and shipping integrations. Built with Next.js, tRPC, Prisma, and Stripe Connect.",
  "tags": [
    "marketplace",
    "ecommerce",
    "multi-vendor",
    "stripe-connect",
    "nextjs",
    "trpc",
    "prisma",
    "postgresql",
    "production"
  ],
  "requiredEnv": [
    {
      "name": "DATABASE_URL",
      "description": "PostgreSQL database for all application data",
      "example": "postgresql://user:pass@localhost:5432/marketplace"
    },
    {
      "name": "STRIPE_SECRET_KEY",
      "description": "Stripe secret key with Connect capabilities enabled",
      "example": "sk_live_..."
    },
    {
      "name": "STRIPE_CONNECT_WEBHOOK_SECRET",
      "description": "Webhook secret for Stripe Connect events",
      "example": "whsec_..."
    }
  ],
  "view": [
    { "path": "README.md", "lines": "all" },
    { "tree": { "path": "src", "depth": 3, "limit": 150 } },
    { "path": "docs/ARCHITECTURE.md", "lines": [1, 200] },
    { "path": "src/server/api/root.ts", "lines": "all" },
    { "path": "src/pages/api/webhooks/stripe.ts", "lines": [1, 150] },
    { "path": "prisma/schema.prisma", "lines": [1, 100] }
  ]
}
```

**Detailed Package Example:**

```json
{
  "type": "package",
  "slug": "feature-flags",
  "name": "Feature Flag System",
  "description": "Runtime feature flag system with React hooks, HOCs, and server-side utilities. Supports percentage rollouts, user targeting, A/B tests, and flag prerequisites. Integrates with LaunchDarkly, Split.io, or uses local JSON config.",
  "tags": [
    "feature-flags",
    "experimentation",
    "ab-testing",
    "react",
    "typescript",
    "launchdarkly",
    "split"
  ],
  "view": [
    { "path": "README.md", "lines": "all" },
    { "tree": { "path": "src", "depth": 4, "limit": 100 } },
    { "path": "src/index.ts", "lines": "all" },
    { "path": "src/react/FeatureFlag.tsx", "lines": "all" },
    { "path": "src/providers/launchdarkly.ts", "lines": [1, 100] },
    { "path": "examples/basic-usage.tsx", "lines": "all" }
  ]
}
```

### SW CLI Commands
The `sw` CLI will read package.json + sw.json files to understand each artifact and its dependency structure, and return these to the user.

Commands like the below are commonplace. 
```bash
sw list templates --filter-tag nextjs --long
sw view templates/saas-starter
sw view templates/saas-starter --override src/app/layout.tsx #optional 
sw use templates/saas-starter
```

We should keep the end goal of the `sw` CLI in mind when writing code. This means maintaining strong organization, consistency, and code quality throughout the project, and refactoring SHARED, REUSABLE code into discrete packages.