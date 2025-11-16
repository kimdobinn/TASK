# Getting Started - Class Scheduler

Welcome! This guide will get you up and running in under 5 minutes.

## ✅ What's Already Done

Good news! The app is ready to use:
- ✅ Development server is running at http://localhost:3000
- ✅ Database is fully configured with all tables
- ✅ All migrations have been applied
- ✅ Authentication is working
- ✅ 3 test users exist in the database

## 🚀 Quick Start (3 Steps)

### Step 1: Create a Test Account

1. Visit http://localhost:3000/auth/signup
2. Fill in the form:
   ```
   Email: your-email@example.com
   Full Name: Your Name
   Role: Student (or Tutor)
   Time Zone: (auto-detected)
   Password: Test1234!  (or any password meeting requirements)
   Confirm Password: Test1234!
   ```
3. Click "Sign up"

**Password Requirements:**
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Step 2: Explore Your Dashboard

After signup, you'll be redirected to your role-specific dashboard:

**If you chose Student:**
- Browse tutors at `/dashboard/student/browse`
- Book a session with a tutor
- View your bookings

**If you chose Tutor:**
- Set your availability at `/dashboard/tutor/availability`
- Wait for booking requests (or create a student account to test)
- Approve/reject requests

### Step 3: Test the Full Flow

**To test the complete booking workflow:**

1. **Create a Tutor account** (if you haven't):
   - Sign out (if signed in)
   - Go to signup and create account with role "Tutor"
   - Set availability: Click "Add Time Slot" and set some hours

2. **Create a Student account** (use different email):
   - Sign out
   - Go to signup and create account with role "Student"
   - Browse tutors
   - Book a session with the tutor you created

3. **Approve the booking** (switch back to tutor):
   - Sign out
   - Sign in with tutor account
   - Go to "Requests" tab
   - Approve the booking request

4. **See real-time update** (switch back to student):
   - Open student dashboard in another browser/tab
   - You'll see a toast notification when tutor approves!

## 🎯 What to Test

### Core Features

- [x] **Signup** - Create student and tutor accounts
- [x] **Login** - Sign in with created accounts
- [x] **Student: Browse Tutors** - See available tutors
- [x] **Student: Book Session** - Request a tutoring session
- [x] **Tutor: Set Availability** - Add weekly time slots
- [x] **Tutor: Approve Booking** - Review and approve requests
- [x] **Real-time Updates** - See instant notifications
- [x] **Timezone Support** - Times shown in your timezone

### Advanced Features

- [x] **Tutor: Block Times** - Mark unavailable periods
- [x] **Student: View History** - See past bookings
- [x] **Notifications** - In-app notification system
- [x] **Mobile Responsive** - Test on phone (or DevTools mobile view)

## 📱 Accessing the App

- **Homepage**: http://localhost:3000
- **Signup**: http://localhost:3000/auth/signup
- **Login**: http://localhost:3000/auth/login
- **Student Dashboard**: http://localhost:3000/dashboard/student
- **Tutor Dashboard**: http://localhost:3000/dashboard/tutor

## 🔍 Troubleshooting

### "Invalid email or password"

**Cause**: You're trying to log in with an account that doesn't exist.

**Solution**: Create a new account first at http://localhost:3000/auth/signup

### Can't See Any Tutors

**Cause**: No tutors have been created yet or tutors haven't set availability.

**Solution**:
1. Create a tutor account
2. Set availability time slots
3. Then try browsing as a student

### Port 3000 Already in Use

**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Page Won't Load

**Solution**:
```bash
# Clear cache and restart
rm -rf .next
npm run dev
```

## 📚 Next Steps

Once you've tested the basics:

1. **Read the full README**: [README.md](./README.md)
2. **Check out documentation**:
   - [Testing Guide](./docs/TESTING_GUIDE.md) - Comprehensive testing checklist
   - [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Deploy to production
   - [Project Completion](./docs/PROJECT_COMPLETION.md) - Full project details

## 💡 Tips

- **Use two browsers** to test student and tutor flows simultaneously
- **Check browser console** (F12) for any errors while testing
- **Try the real-time updates** by having student and tutor dashboards open at the same time
- **Test on mobile** to see the responsive design in action

## ✅ Checklist

Complete this checklist to verify everything works:

- [ ] Created a student account
- [ ] Created a tutor account
- [ ] Tutor set availability
- [ ] Student browsed tutors
- [ ] Student booked a session
- [ ] Tutor received booking request
- [ ] Tutor approved booking
- [ ] Student saw approval notification
- [ ] Checked that times show in correct timezone

---

**Need Help?** Check the [README.md](./README.md) troubleshooting section or review the [Testing Guide](./docs/TESTING_GUIDE.md).

**Ready?** Visit http://localhost:3000 and start testing! 🚀
