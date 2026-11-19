This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Catalogue data and storage

The MVP catalogue can be imported into Supabase with:

```sh
pnpm catalogue:prepare
pnpm catalogue:upload
pnpm catalogue:seed
```

See [the catalogue import guide](scripts/catalogue/README.md) for migration
prerequisites, environment configuration, generated seed files, storage URL
rewriting, and how to safely rerun an import.

## Git Worktrees

This project supports isolated git worktrees inside `.worktrees/<name>`, each optionally backed by its own Supabase OrbStack VM and `.env.local` configuration.

### Creating a Worktree

```bash
# Create a worktree and start dedicated Supabase VM (default)
pnpm worktree:add <name> [base-branch]

# Create git worktree only (without starting Supabase VM)
pnpm worktree:add <name> --no-vm
```

### Listing Worktrees

```bash
pnpm worktree:list
```

### Deleting a Worktree

```bash
# Remove worktree and its Supabase VM
pnpm worktree:delete <name>

# Remove worktree, VM, and delete the associated local git branch
pnpm worktree:delete <name> --delete-branch

# Force remove dirty worktree and force delete branch
pnpm worktree:delete <name> -f -D

# Delete all worktrees under .worktrees/
pnpm worktree:delete --all

# Prune stale/broken worktrees
pnpm worktree:prune
```

#### Native Git Commands to Delete a Worktree

If you prefer to delete a worktree directly with git:

```bash
# 1. Remove the worktree folder and git registration
git worktree remove .worktrees/<name>

# Or force-remove if modified or untracked files exist
git worktree remove --force .worktrees/<name>

# 2. Prune any stale worktree references
git worktree prune -v

# 3. (Optional) Delete the local git branch
git branch -d <name>   # safe delete
git branch -D <name>   # force delete
```
