# Mobile Repair Service - Backend API

A comprehensive backend API for a mobile repair service web application built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (User, Agent, Admin)
- **OTP Verification**: Email-based OTP verification for registration and password reset
- **Real-time Communication**: Socket.io integration for live notifications and chat
- **File Upload**: Cloudinary integration for image uploads (max 5 images per booking)
- **Payment Processing**: Stripe integration for secure payments
- **Booking System**: Complete booking flow with time restrictions and agent assignment
- **Agent Management**: Agent application, approval, and dashboard functionality
- **Admin Panel**: Full admin capabilities for managing users, agents, bookings, and system data
- **Review System**: Customer review and rating system for agents

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **File Storage**: Cloudinary
- **Payments**: Stripe
- **Email**: Nodemailer (Gmail SMTP)
- **Validation**: express-validator

## Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.sample .env
   \`\`\`
   Fill in your environment variables in the `.env` file.

4. **Database Setup**
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in your `.env` file

5. **Seed Database**
   \`\`\`bash
   npm run seed
   \`\`\`

6. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

The server will start on `http://localhost:5000`

## Environment Variables

Create a `.env` file with the following variables:

\`\`\`env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/mobile-repair-service
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update user profile
- `POST /api/user/addresses` - Add address
- `PATCH /api/user/addresses/:id` - Update address
- `DELETE /api/user/addresses/:id` - Delete address

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/status` - Update booking status
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Agent Routes
- `POST /api/agent/apply` - Apply to become agent
- `GET /api/agent/dashboard` - Agent dashboard
- `GET /api/agent/bookings` - Agent bookings
- `PATCH /api/agent/status` - Update online status

### Admin Routes
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Manage users
- `GET /api/admin/agent-applications` - Manage agent applications
- `PATCH /api/admin/agent-applications/:id` - Approve/reject agent
- `GET /api/admin/bookings` - Manage bookings
- `POST /api/admin/cities` - Add city
- `POST /api/admin/devices` - Add device

### Devices & Cities
- `GET /api/devices/categories` - Get device categories
- `GET /api/devices/brands/:category` - Get brands by category
- `GET /api/devices/models/:category_id` - Get models by category
- `GET /api/devices/search` - Search devices
- `POST /api/admin/devices` - Add device (admin only)
- `GET /api/cities/public` - Get public cities list
- `POST /api/admin/cities` - Add city (admin only)

### File Upload
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/image` - Upload single image
- `DELETE /api/upload/image/:publicId` - Delete image

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/webhook` - Stripe webhook

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/booking/:bookingId` - Get booking review
- `GET /api/reviews/agent/:agentId` - Get agent reviews

## Database Structure

The application uses Supabase (PostgreSQL) with the following main tables:

### Core Tables
- **profiles** - User profiles with role-based access (user, agent, admin)
- **agents** - Agent-specific information and status
- **cities** - Available service cities with delivery charges
- **categories** - Device categories (mobile, laptop, tablet, etc.)
- **brands** - Device brands organized by category
- **devices** - Device models with brand and category relationships
- **bookings** - Repair service bookings
- **reviews** - Customer reviews and ratings
- **chats** - Real-time messaging between users and agents

### Key Relationships
- Users can have different roles (user, agent, admin)
- Agents are approved users with additional shop information
- Devices are organized by category → brand → model hierarchy
- Bookings link users, agents, and devices
- Reviews are tied to completed bookings

## Socket.io Events

### Client to Server
- `join_booking` - Join booking room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server to Client
- `new_booking` - New booking notification
- `booking_update` - Booking status update
- `new_message` - New

# Supabase Migration Guide

## 1. Database Migration
- Use the `schema.sql` file to create tables in your Supabase project:
  1. Open the Supabase SQL editor.
  2. Paste the contents of `schema.sql` and run it.

## 2. Environment Variables
- Add the following to your backend environment (e.g., `.env`):
  ```env
  SUPABASE_URL=your-supabase-url
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

## 3. Supabase Client
- Use `supabaseClient.ts` to interact with Supabase from backend scripts or edge functions.

## 4. Files to Delete/Replace
- **Delete all Mongoose models:**
  - `backend/models/Agent.js`
  - `backend/models/User.js`
  - `backend/models/Booking.js`
  - `backend/models/Device.js`
  - `backend/models/City.js`
  - `backend/models/Review.js`
  - `backend/models/Chat.js`
- **Delete custom auth logic:**
  - `backend/middleware/auth.js`
  - Any JWT/bcrypt logic in routes or controllers
- **Replace with Supabase logic:**
  - Use Supabase Auth for sign up, sign in, password reset, and email verification
  - Use Supabase Storage for file uploads
  - Use Supabase Realtime for chat and job tracking

## 5. Auth Flow Outline
- Use Supabase Auth for all authentication:
  - Sign up/sign in with email/password or OTP
  - Roles managed via `role` field in `profiles` table or user metadata
  - Forgot password and email verification handled by Supabase
  - Use Supabase RLS (Row Level Security) for role-based access

## 6. Next Steps
- Refactor backend logic to use Supabase queries instead of Mongoose
- Move file uploads to Supabase Storage
- Replace Socket.io with Supabase Realtime
- Move business logic to Supabase Edge Functions or serverless endpoints
