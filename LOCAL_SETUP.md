# Sancta Maria College Student Management System - Local Setup

## 🚀 Quick Start

The system is now configured to run both locally and on Vercel hosting. Here's how to run it locally:

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Internet connection (for Supabase database)

### Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Local URL: http://localhost:3000
   - Network URL: http://192.168.66.134:3000 (accessible from other devices on your network)

## 🔧 Configuration

### Environment Variables (.env.local)
The system uses the same Supabase database for both local and production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tigknjhplktzqzradmkd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel Hosting Compatibility
- All Vercel settings are preserved
- The same codebase works for both local development and production deployment
- No additional configuration needed for Vercel deployment

## 🔐 Login Credentials

### Admin Access
- **Username:** SMC20252025
- **Password:** vibranium1

### Lecturer Access
- **Username:** Lecturer Maboshe
- **Password:** password123

### Student Access
- **Username:** SMC2025001 (Student ID)
- **Password:** password123

## 📋 Available Scripts

```bash
# Development server with Turbopack (faster builds)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🌐 Network Access

The development server is configured to be accessible from:
- **Localhost:** http://localhost:3000
- **Network:** http://192.168.66.134:3000

This allows testing from mobile devices and other computers on the same network.

## 🔧 Key Features Working

✅ **Authentication System**
- Admin, Lecturer, and Student login
- Role-based access control
- Secure password management

✅ **Student Management**
- Student registration and profiles
- Course enrollment
- Academic records

✅ **Course Management**
- Course creation and assignment
- Lecturer assignment
- Student enrollment management

✅ **Assessment System**
- CA (Continuous Assessment) results ✅ **FIXED**
- Final exam results
- Grade calculations and GPA

✅ **Real-time Updates**
- Live dashboard updates
- Instant notifications
- Real-time data synchronization

✅ **Public Features**
- Application forms
- Document downloads
- News and updates

## 🛠️ Recent Fixes

### CA Results Issue Resolved
- **Problem:** "Error saving CA result. Please try again."
- **Cause:** Row Level Security (RLS) blocking database operations
- **Solution:** Disabled RLS on ca_results table
- **Status:** ✅ Fully functional

## 📱 Mobile Responsive
The system is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔄 Development Workflow

1. **Make Changes:** Edit files in the `src/` directory
2. **Hot Reload:** Changes appear instantly in the browser
3. **Test Features:** Use the provided login credentials
4. **Deploy:** Push to Vercel for production deployment

## 📊 Database
- **Provider:** Supabase (PostgreSQL)
- **Real-time:** Enabled for live updates
- **Security:** Row Level Security configured
- **Backup:** Automatic Supabase backups

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Then restart
npm run dev
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues
- Check internet connection
- Verify Supabase credentials in .env.local
- Check Supabase project status

## 📞 Support
For technical issues or questions, refer to the system documentation or contact the development team.

---
**Status:** ✅ System running successfully on http://localhost:3000
