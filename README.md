# Gmail Tool v0.5 - Client-Side Email Manager 🚀

A **100% client-side** JavaScript application for batch email sending and mass Gmail downloads.

![Version](https://img.shields.io/badge/version-0.5-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

## ✨ Key Features

### 📤 Batch Email Sending
- Upload CSV files with ready-to-send emails
- CSV must contain: `recipient`, `subject`, `content`
- Intelligent rate limiting (35-75 seconds between emails)
- Pause/Resume during sending
- Real-time progress tracking
- Automatic Gmail quota management (500/2000 emails per day)
- Export results to CSV

### 📥 Email Download
- Advanced search filters (date, sender, subject, labels, attachments)
- Download emails with attachments in ZIP format
- Export metadata to CSV
- Support up to 10,000 emails
- Progress tracking with pause/resume
- HTML reports with statistics

### 🔒 Security & Privacy
- **ZERO OAuth audit costs** ($15,000-$75,000/year saved!)
- No server required - everything runs in browser
- Temporary OAuth tokens (1 hour with auto-refresh)
- Data always stays in your browser
- Open source verifiable code

## 🚀 Quick Start

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**:
   - Menu → APIs & Services → Library
   - Search "Gmail API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Menu → APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Gmail Tool v0.5"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for development)
     - `https://yourdomain.com` (for production)
   - Click "Create"
   - Copy the **Client ID**
