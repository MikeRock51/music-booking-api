# Music Booking API

A comprehensive RESTful API for a Music Booking platform that handles artist profiles, event listings, and booking transactions.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Artist Profiles**: Create and manage artist profiles with genres, rates, and availability
- **Event Management**: Create, publish, and manage music events and venues
- **Booking System**: Complete booking workflow with status tracking and payment management
- **Search & Filtering**: Advanced search capabilities for artists and events

## Tech Stack

- **Node.js & Express**: Backend framework
- **TypeScript**: Type-safe JavaScript
- **MongoDB & Mongoose**: Database and ODM
- **JWT**: Authentication
- **Express Validator**: Input validation
- **Helmet**: Security headers
- **Rate Limiting**: API protection
- **Multer & AWS S3**: File uploads

## Database Schema

### Core Models

- **User**: Base user model with authentication details and role
- **Artist**: Artist profile linked to a user
- **Venue**: Location where events take place
- **Event**: Music events that can be booked
- **Booking**: Transactions between artists and organizers

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user profile
- `POST /auth/upgrade-to-organizer` - Upgrade user to organizer role

### Artists

- `POST /artists/profile` - Create artist profile
- `GET /artists/profile` - Get logged-in artist's profile
- `PUT /artists/profile` - Update artist profile
- `GET /artists` - Search artists with filters
- `GET /artists/:id` - Get artist by ID

### Events

- `POST /events` - Create a new event
- `GET /events` - Search events with filters
- `GET /events/my-events` - Get organizer's events
- `GET /events/:id` - Get event by ID
- `PUT /events/:id` - Update event
- `PATCH /events/:id/publish` - Publish event
- `PATCH /events/:id/cancel` - Cancel event

### Venues

- `POST /venues` - Create a new venue
- `GET /venues` - Search venues with filters
- `GET /venues/my-venues` - Get venues owned by logged-in user
- `GET /venues/:id` - Get venue by ID
- `PUT /venues/:id` - Update venue details
- `DELETE /venues/:id` - Delete venue
- `POST /venues/:id/images` - Upload venue images
- `PATCH /venues/:id/verify` - Verify venue (admin only)

### Bookings

- `POST /bookings` - Create a booking request
- `GET /bookings/:id` - Get booking details
- `GET /bookings/artist` - Get artist's bookings
- `GET /bookings/organizer` - Get organizer's bookings
- `PATCH /bookings/:id/status` - Update booking status
- `PATCH /bookings/:id/payment` - Update payment status
- `PATCH /bookings/:id/confirm` - Artist confirms booking
- `PATCH /bookings/:id/reject` - Artist rejects booking
- `PATCH /bookings/:id/cancel` - Cancel booking
- `PATCH /bookings/:id/complete` - Mark booking as completed

## Getting Started

### Prerequisites

- Node.js v20 or later
- MongoDB
- AWS S3 account (for file uploads)

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_URI=mongodb://localhost:27017/music-booking
TEST_DB_URI=mongodb://localhost:27017/music-booking-test

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

# AWS S3
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# CORS
CORS_ORIGIN=*
```

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/music-booking-api.git
   cd music-booking-api
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Build for production
   ```bash
   npm run build
   ```

5. Run in production
   ```bash
   npm start
   ```

### Testing with Postman

1. Import the Postman collection from `/postman/Music_Booking_API.postman_collection.json`
2. Set up an environment with the following variables:
   - `baseUrl`: The API URL (e.g., `http://localhost:3000`)
   - `token`: Will be set after login
   - `userId`, `artistId`, `eventId`, `venueId`, `bookingId`: Will be set as you create resources

## Security Considerations

- All endpoints use JWT authentication (except registration, login, and public searches)
- Role-based authorization for sensitive operations
- Input validation on all endpoints
- Rate limiting to prevent abuse
- Security headers with Helmet

## Scalability

- Database indexes for optimized queries
- Connection pooling for database scalability
- Pagination implemented on list endpoints
- Proper error handling and validation

## Future Enhancements

- Add reviews and ratings for artists
- Implement real-time notifications
- Add payment gateway integration
- Create admin dashboard
- Add more analytics and reporting features

## License

MIT