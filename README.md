# Tap to Order System

A modern, responsive web application built with Nuxt 3, Vue 3, and Pinia, designed to provide a seamless ordering experience for restaurants and cafes.

## ✨ Features

- 🍽️ Interactive menu browsing
- 🛒 Real-time cart management
- 📱 Progressive Web App (PWA) support
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design for all devices
- 🔄 State management with Pinia
- 📊 Built-in analytics with nuxt-charts
- 🔍 SEO optimized

## 🚀 Tech Stack

- **Frontend**: Vue 3, Nuxt 3
- **State Management**: Pinia with persistence
- **Styling**: Tailwind CSS
- **UI Components**: Element Plus
- **Icons**: Nuxt Icon
- **Charts**: nuxt-charts
- **Build Tool**: Vite
- **Linting**: ESLint

## 🛠️ Prerequisites

- Node.js 18+ (LTS recommended)
- npm, pnpm, yarn, or bun package manager
- Git

## 🏗️ Setup

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd tap-to-order
   ```

2. Install dependencies:
   ```bash
   # Using npm
   npm install

   # Using pnpm
   pnpm install

   # Using yarn
   yarn install

   # Using bun
   bun install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in the `.env` file.

## 🚦 Development

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## 🏗️ Building for Production

1. Build the application:
   ```bash
   # npm
   npm run build

   # pnpm
   pnpm build

   # yarn
   yarn build

   # bun
   bun run build
   ```

2. Preview the production build:
   ```bash
   # npm
   npm run preview

   # pnpm
   pnpm preview

   # yarn
   yarn preview

   # bun
   bun run preview
   ```

## 📂 Project Structure

```
.
├── assets/          # Global styles, images, and fonts
├── components/      # Reusable Vue components
├── composables/     # Vue 3 composables
├── layouts/         # Layout components
├── pages/           # Application views and routes
├── plugins/         # Nuxt plugins
├── public/          # Static files
├── stores/          # Pinia stores
├── .env             # Environment variables
├── nuxt.config.ts   # Nuxt configuration
└── tailwind.config.js # Tailwind CSS configuration
```

## 🙏 Acknowledgments

- [Nuxt.js](https://nuxt.com/)
- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Element Plus](https://element-plus.org/)
- [Pinia](https://pinia.vuejs.org/)
