# QR Generator Sales Tracker

A modern web application for generating and managing QR codes for sales tracking. Built with React, TypeScript, and Vite.

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
```

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT License - feel free to use this code for your own projects.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 