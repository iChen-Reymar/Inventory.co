# Inventory.oc - Inventory Management System

A modern inventory management system built with React, Vite, and Supabase, featuring a complete dashboard for managing products, categories, staff, and customers.

## Features

- **Authentication**: Signup and Login with Supabase Auth
- **Dashboard**: Home page with stock numbers, top categories, and orders
- **Product Management**: Add, view, and manage products with stock tracking
- **Category Management**: Organize products by categories
- **Staff Management**: Manage staff members with roles
- **Customer Management**: Track customers with email search
- **Settings**: User profile and permission management
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean white and blue color scheme with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Inventory.co
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Follow the instructions in `SUPABASE_SETUP.md`
   - Create a `.env` file with your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Run the database schema**
   - Go to Supabase SQL Editor
   - Run the SQL from `database/schema.sql`

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
Inventory.co/
├── src/
│   ├── components/          # React components
│   │   ├── Layout.jsx       # Main layout with sidebar
│   │   ├── Home.jsx         # Dashboard home page
│   │   ├── Products.jsx     # Products management
│   │   ├── Categories.jsx   # Categories management
│   │   ├── Staffs.jsx       # Staff management
│   │   ├── Customers.jsx    # Customer management
│   │   ├── Settings.jsx     # User settings
│   │   ├── Login.jsx       # Login form
│   │   ├── Signup.jsx      # Signup form
│   │   └── Add*Modal.jsx   # Modal components
│   ├── lib/
│   │   └── supabase.js     # Supabase client configuration
│   ├── services/           # Database service functions
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── categoryService.js
│   │   ├── staffService.js
│   │   ├── customerService.js
│   │   └── orderService.js
│   ├── App.jsx             # Main app with routing
│   ├── main.jsx            # React entry point
│   └── index.css           # Global styles
├── database/
│   ├── schema.sql          # Database schema
│   └── README.md          # Database documentation
├── public/
│   └── images/            # Product images
├── index.html              # HTML template
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── package.json           # Dependencies
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Database + Auth)
- **PostgreSQL** - Database (via Supabase)

## Database Schema

The database includes the following tables:
- `profiles` - User profiles
- `categories` - Product categories
- `products` - Inventory products
- `staff` - Staff members
- `customers` - Customer accounts
- `orders` - Customer orders

See `database/schema.sql` for complete schema details.

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control (Admin, Manager, Staff, Customer)
- Secure authentication via Supabase Auth
- Environment variables for sensitive data




