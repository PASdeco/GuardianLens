# Guardian Lens

Guardian Lens is a scanner-first health-commerce safety PWA for GenLayer Studionet. It prepares privacy-safe product evidence in the browser, checks public regulatory sources, and submits bounded assessments to a GenLayer Intelligent Contract where validators reason independently.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

The application runs in evidence-preparation mode when Privy, Supabase, relayer, or contract addresses are not configured. It never substitutes a local verdict for GenLayer consensus.

## Checks

```bash
npm run check
```

See `docs/deployment.md` for the zero-cost Studionet deployment path.
