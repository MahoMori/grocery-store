# Grocery Store GraphQL API

## Deployment to Vercel

### Prerequisites

- Vercel CLI installed: `npm i -g vercel`
- PostgreSQL database (configured)

### Environment Variables

Set these in Vercel:

```bash
vercel env add DATABASE_URL production
```

### Deploy

```bash
vercel --prod
```

### Access Your API

After deployment, your API will be available at:

```
https://your-project-name.vercel.app
```

### Apollo Studio Sandbox

Use your deployed URL with Apollo Studio:

```
https://studio.apollographql.com/sandbox/explorer?endpoint=https://grocery-store-virid.vercel.app
```

## Local Development

```bash
npm install
npm start
```

## Features

- GraphQL API for grocery store management
- Product, Staff, Cart, and Merchant management
- PostgreSQL database integration
- Authentication support
