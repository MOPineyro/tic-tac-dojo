# Tic-Tac-Dojo Admin Panel

A comprehensive admin interface for managing the Tic-Tac-Dojo game system, including user management, points adjustment, and system monitoring.

## Features

### 🎮 Dashboard
- **System Overview**: Total players, games, and activity statistics
- **Player Distribution**: Visual charts showing players across different levels
- **Win Rate Analysis**: Player success rates by difficulty level
- **Real-time Metrics**: Live system performance and activity tracking

### 👥 User Management
- **User Search & Filtering**: Find users by name or ID with advanced sorting
- **User Profile Editing**: Modify usernames, scores, and level access
- **Points Adjustment**: Add or subtract points with audit trail
- **User Deletion**: Remove users and associated game data
- **Bulk Operations**: Manage multiple users efficiently

### 📊 Admin Logs
- **Action Tracking**: Complete audit trail of all admin actions
- **Point Adjustments**: Track all score modifications with reasons
- **System Changes**: Monitor level unlocks and user modifications
- **Security Monitoring**: IP tracking and access logging

## Access

The admin panel is available at: `https://tic-tac-dojo.vercel.app/admin`

### Authentication
- Secured with admin key authentication
- Uses the same `ADMIN_KEY` environment variable as the API
- Session management with secure local storage
- Automatic logout on invalid credentials

## API Endpoints

The admin panel uses dedicated API routes:

### Users Management
- `GET /api/admin/users/index` - List all users with pagination and search
- `GET /api/admin/users/{userId}` - Get specific user details
- `PUT /api/admin/users/{userId}` - Update user information
- `DELETE /api/admin/users/{userId}` - Delete user and associated data
- `POST /api/admin/users/{userId}/adjust-points` - Adjust user points

### System Statistics
- `GET /api/admin/stats/index` - Get system statistics and dashboard data
- `GET /api/admin/stats/logs` - Get admin action logs with pagination

## Setup & Deployment

### Environment Variables
Ensure these environment variables are set in your Vercel deployment:

```env
ADMIN_KEY=your-secret-admin-key
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

### Vercel Configuration
The admin panel is automatically deployed with the API. The `vercel.json` includes:

```json
{
  "rewrites": [
    {
      "source": "/admin/(.*)",
      "destination": "/public/admin/$1"
    },
    {
      "source": "/admin",
      "destination": "/public/admin/index.html"
    }
  ]
}
```

### Security Headers
The admin panel includes proper CORS and caching headers for security.

## Usage Guide

### First-Time Setup
1. Deploy the application to Vercel with proper environment variables
2. Navigate to `/admin` on your deployed domain
3. Enter your admin key to authenticate
4. The dashboard will load with current system statistics

### Managing Users
1. Go to the "User Management" tab
2. Use search and filters to find specific users
3. Click action buttons to:
   - **Edit**: Modify user details and level access
   - **Coins**: Adjust user points (positive or negative)
   - **Delete**: Remove user and all associated data

### Monitoring System
1. **Dashboard**: Monitor real-time system health and player activity
2. **Admin Logs**: Review all administrative actions for audit purposes
3. **Level Distribution**: Track player progression across difficulty levels

### Point Adjustments
When adjusting user points:
- Enter positive numbers to add points
- Enter negative numbers to subtract points
- Always provide a reason for the adjustment
- All adjustments are logged with timestamp and admin identification

## Technical Implementation

### Frontend
- **Pure HTML/CSS/JavaScript** - No frameworks for maximum compatibility
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI/UX** - Clean, professional interface with smooth animations
- **Real-time Updates** - Automatic data refresh and live statistics

### Backend
- **Serverless Architecture** - Vercel serverless functions
- **Firebase Integration** - Secure database operations
- **Rate Limiting** - Protection against abuse
- **Audit Logging** - Complete action tracking
- **Input Validation** - Sanitized and validated inputs

### Security Features
- **Admin Key Authentication** - Secure access control
- **CORS Protection** - Proper cross-origin resource sharing
- **Input Sanitization** - Protection against injection attacks
- **Audit Trail** - Complete logging of all administrative actions
- **IP Tracking** - Monitor access patterns

## Development

### Local Development
1. Ensure all environment variables are set
2. Run `npm run dev` for local API development
3. Access admin panel at `http://localhost:3000/admin`

### File Structure
```
api/admin/
├── users/
│   └── [...params].ts    # User management endpoints
└── stats/
    └── [...params].ts    # Statistics and logging endpoints

public/admin/
├── index.html           # Admin panel interface
├── styles.css          # Responsive styling
└── script.js           # Frontend functionality
```

## Support & Troubleshooting

### Common Issues
1. **Authentication Failed**: Verify `ADMIN_KEY` environment variable
2. **Data Not Loading**: Check Firebase credentials and permissions
3. **API Errors**: Review Vercel function logs for details

### Error Handling
The admin panel includes comprehensive error handling:
- Network connectivity issues
- Authentication failures
- Data validation errors
- Server-side exceptions

All errors are displayed to the user with actionable feedback.

## Security Considerations

- Never share admin keys or include them in client-side code
- Regularly review admin logs for unauthorized access
- Use strong, unique admin keys
- Monitor system metrics for unusual activity
- Keep environment variables secure in Vercel settings

## Future Enhancements

Potential areas for expansion:
- Multi-admin support with role-based permissions
- Advanced analytics and reporting
- Bulk user import/export functionality
- Real-time notifications for critical events
- Enhanced search and filtering capabilities
