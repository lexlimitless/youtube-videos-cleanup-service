# QR Code Generator & Sales Tracker

A web application to generate QR codes that track sales and user engagement.

Testing auto-deployment from main branch.

## Features

- Generate QR codes with custom data
- Track sales through QR code scans
- Modern, responsive UI with Tailwind CSS
- Real-time QR code preview
- Secure authentication with Supabase

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase for authentication and database
- QRCode.react for QR code generation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lexlimitless/QR-Generator-Sales-Tracker.git
cd QR-Generator-Sales-Tracker
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

4. Start the development server:
```