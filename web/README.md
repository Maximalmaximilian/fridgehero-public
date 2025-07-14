# FridgeHero Web Application

> **Next.js 14 web application showcasing modern full-stack development with TypeScript, Supabase integration, and responsive design**

## 🎯 Project Overview

A Next.js web application that demonstrates modern web development skills including server-side rendering, authentication, responsive design, and real-time database integration. Built as a companion to the React Native mobile app, sharing the same backend infrastructure.

## 🚀 Technical Features

### **Implemented Architecture**
- **Next.js 14**: App Router with server-side rendering
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with custom design system
- **Supabase Integration**: Authentication and database connectivity
- **Responsive Design**: Mobile-first approach with breakpoint system
- **Authentication Middleware**: Route protection and session management

### **Modern Development Practices**
- **App Router**: Latest Next.js routing paradigm
- **Server Components**: Optimized rendering performance
- **TypeScript**: Comprehensive type coverage
- **Component Architecture**: Modular, reusable components
- **CSS-in-JS**: Tailwind utility classes with custom extensions

## 📁 Project Architecture

```
web/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (authenticated)/   # Protected route group
│   │   │   ├── dashboard/     # User dashboard
│   │   │   ├── households/    # Household management
│   │   │   ├── items/         # Item management
│   │   │   └── layout.tsx     # Authenticated layout
│   │   ├── auth/              # Authentication pages
│   │   │   ├── signin/        # Sign in page
│   │   │   ├── signup/        # Sign up page
│   │   │   ├── callback/      # OAuth callback
│   │   │   └── error/         # Error handling
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Homepage
│   ├── components/            # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   └── Navigation.tsx     # Navigation component
│   ├── lib/                   # Utilities and configurations
│   │   ├── supabase.ts        # Supabase client
│   │   └── design-tokens.ts   # Design system tokens
│   └── middleware.ts          # Authentication middleware
├── public/                    # Static assets
├── supabase/                  # Database migrations
├── tailwind.config.ts         # Tailwind configuration
├── next.config.js            # Next.js configuration
└── package.json              # Dependencies and scripts
```

## 🛠️ Technical Stack

- **Framework**: Next.js 14.1.3 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.17
- **Database**: Supabase PostgreSQL (shared with mobile app)
- **Authentication**: Supabase Auth with Next.js integration
- **Deployment**: Vercel-optimized configuration
- **Development**: ESLint, PostCSS, Autoprefixer

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env.local

# Configure environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev

# Visit http://localhost:3000
```

## 🔧 Key Technical Implementations

### **Authentication System**
- **Server-side Authentication**: Next.js middleware for route protection
- **Session Management**: Supabase Auth with JWT tokens
- **Form Validation**: Client and server-side validation
- **Error Handling**: Comprehensive error states and user feedback

### **Database Integration**
- **Shared Schema**: Same Supabase instance as mobile app
- **Real-time Updates**: WebSocket subscriptions for live data
- **Type Safety**: Generated TypeScript types from database schema
- **Row Level Security**: Server-side data protection

### **Responsive Design System**
- **Mobile-first**: Progressive enhancement approach
- **Breakpoint System**: Tailwind's responsive utilities
- **Component Consistency**: Shared design tokens
- **Accessibility**: WCAG compliance considerations

### **Performance Optimizations**
- **Server Components**: Optimized rendering strategy
- **Code Splitting**: Automatic bundle optimization
- **Image Optimization**: Next.js Image component
- **Caching**: Server-side and client-side caching strategies

## 🎨 Design System Integration

### **Tailwind Configuration**
```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#059669',    // FridgeHero Green
        secondary: '#047857',  // Dark Green
        // ... additional color tokens
      },
      spacing: {
        // 8px grid system
      },
      typography: {
        // Custom font scales
      }
    }
  }
}
```

### **Component Architecture**
- **Atomic Design**: Scalable component structure
- **Reusable Patterns**: Consistent UI building blocks
- **TypeScript Props**: Fully typed component interfaces
- **Accessibility**: ARIA labels and semantic HTML

## 🔐 Security Implementation

- **Authentication Middleware**: Route-level protection
- **CSRF Protection**: Built-in Next.js security
- **Input Validation**: Form sanitization and validation
- **Environment Variables**: Secure configuration management

## 📊 Performance Metrics

### **Target Benchmarks**
- **Lighthouse Score**: 95+ across all categories
- **Core Web Vitals**: All metrics in green
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Bundle Size**: Optimized for fast loading

### **Optimization Strategies**
- **Server-side Rendering**: Faster initial page loads
- **Code Splitting**: Reduced bundle sizes
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Strategic cache headers

## 🔗 Integration with Mobile App

### **Shared Infrastructure**
- **Database**: Same Supabase instance
- **Authentication**: Unified user accounts
- **Types**: Shared TypeScript definitions
- **Design System**: Consistent visual language

### **Cross-platform Consistency**
- **Color Palette**: Matching brand colors
- **Typography**: Similar font hierarchies
- **Component Logic**: Shared business logic patterns
- **User Experience**: Consistent interaction patterns

## 📈 Skills Demonstrated

### **Frontend Development**
- **Next.js**: Modern React framework with App Router
- **TypeScript**: Type-safe development practices
- **Tailwind CSS**: Utility-first styling approach
- **Responsive Design**: Mobile-first development

### **Backend Integration**
- **Supabase**: Database and authentication integration
- **API Design**: RESTful and real-time endpoints
- **Authentication**: Secure session management
- **Data Modeling**: Relational database design

### **Modern Development**
- **Server Components**: Latest React patterns
- **Middleware**: Request/response handling
- **Performance**: Optimization techniques
- **Security**: Best practices implementation

## 🚀 Deployment

### **Vercel Deployment** (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configure environment variables in dashboard
```

### **Alternative Platforms**
- **Netlify**: Static site deployment
- **Railway**: Full-stack hosting
- **Self-hosted**: Docker containerization

## 🧪 Development Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checks
npm run type-check   # TypeScript validation
```

---

**Built with Next.js 14 • TypeScript • Supabase • Tailwind CSS**  
*Demonstrating modern web development skills*
