# Gmail Tool v0.5 - Client-Side Email Manager 🚀

A **100% client-side** JavaScript application for batch email sending and bulk downloading from Gmail.

## ✨ Key Features

### 📤 Batch Email Sending
- CSV file upload with ready-to-send emails
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
- HTML report with statistics

### 🔒 Security & Privacy
- **ZERO OAuth audit costs** ($15,000-$75,000/year saved!)
- No server required - everything runs in the browser
- Temporary OAuth tokens (1 hour with auto-refresh)
- Data always remains in your browser
- Verifiable open source code

## 🚀 Quick Start

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Gmail API**:
   - Menu → APIs & Services → Library
   - Search for "Gmail API"
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

### 2. Application Configuration

#### Method 1: config.json File (Recommended)
1. Copy `config.json.example` to `config.json`
2. Edit the file with your Client ID:
```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "debug": false
}
```

#### Method 2: LocalStorage (For quick testing)
Open the browser console and run:
```javascript
localStorage.setItem('gmail_tool_client_id', 'YOUR_CLIENT_ID.apps.googleusercontent.com');
```

#### Method 3: Global Variable
Add to `index.html` before the scripts:
```html
<script>
  window.GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
</script>
```

### 3. Local Setup

#### Option A: Python (Recommended)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option B: Node.js
```bash
# Install http-server globally
npm install -g http-server

# Start the server
http-server -p 8000
```

#### Option C: VS Code Live Server
- Install the "Live Server" extension
- Right-click on `index.html` → "Open with Live Server"

4. Open your browser: `http://localhost:8000`

## 📖 Usage Guide

### Batch Email Sending

1. **Prepare the CSV file**:
   The CSV must contain exactly these 3 columns:
   - `recipient` - Recipient's email address
   - `subject` - Email subject
   - `content` - Email body (text or HTML)
   
   Example CSV:
   ```csv
   recipient,subject,content
   john.doe@example.com,Important: Account Update,Dear John...
   jane.smith@example.com,Monthly Newsletter,Here are the latest updates...
   ```

2. **Upload the CSV**:
   - Click "Upload CSV File" or drag and drop the file
   - The system automatically verifies the required columns

3. **Preview Check**:
   - Review the email preview
   - Verify recipients and content

4. **Configure Options**:
   - ✅ Delay between emails: Always recommended (35-75 seconds)
   - ⚠️ Batch API: Faster but less control

5. **Start Sending**:
   - Click "Start Sending"
   - Monitor progress in real-time
   - You can pause/resume at any time

### Email Download

1. **Set Filters**:
   - Date: Select time range
   - From/To: Filter by specific emails
   - Subject: Search keywords
   - Options: Only with attachments, unread, etc.

2. **Search Emails**:
   - Click "Search Emails"
   - Review results in the table
   - Max 100 emails per page (with pagination)

3. **Select Emails**:
   - Select individual emails or "Select All"
   - Check the size estimate

4. **Configure Download**:
   - Format: ZIP (complete) or CSV (metadata only)
   - Content: Attachments, email body, headers

5. **Download**:
   - Click "Start Download"
   - Monitor progress
   - When complete, save the ZIP/CSV file

## 🛠️ Advanced Configuration

### Limits and Quotas

Limits are configured in `js/config.js`:

```javascript
RATE_LIMITS: {
    MIN_DELAY_MS: 35000,        // Minimum delay between emails (35 seconds)
    MAX_DELAY_MS: 75000,        // Maximum delay between emails (75 seconds)
    QUOTA_PER_DAY: 500,         // Gmail free
    QUOTA_PER_DAY_WORKSPACE: 2000, // Google Workspace
}
```

### Debug Mode

To enable debug mode, edit `config.json`:

```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "debug": true,
  "logLevel": "debug"
}
```

## 📊 Technical Limits

| Feature | Limit | Notes |
|---------|-------|-------|
| Emails per day | 500 (free) / 2000 (workspace) | Gmail limit |
| Emails per batch | 100 | Gmail API |
| Attachment size | 25 MB | Per single attachment |
| Downloadable emails | 10,000 | Browser memory limit |
| ZIP size | ~500 MB | Depends on browser |
| Token validity | 1 hour | Auto-refresh |

## 🔧 Troubleshooting

### "Tailwind CSS should not be used in production"
- **This is normal** - It's just a development warning
- The app works perfectly
- Tailwind CDN is used only for demo/prototyping

### "Popup blocked"
- Allow popups for localhost:8000
- Chrome: Settings → Privacy → Site Settings → Popups

### "Quota exceeded"
- Daily limit reached (500 emails for free accounts)
- Wait 24 hours or use Workspace account (2000 emails/day)

### "Token expired"
- Normal after 1 hour of inactivity
- Click "Sign In" to automatically renew

### "Failed to fetch"
- Check internet connection
- Ensure Gmail API is enabled
- Verify Client ID is configured correctly

### "Invalid CSV"
- CSV must have exactly 3 columns: `recipient`, `subject`, `content`
- Verify UTF-8 encoding
- Check for commas in content (use quotes if necessary)

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Credits

### Libraries Used
- [Google Identity Services](https://developers.google.com/identity) - OAuth Authentication
- [Gmail API](https://developers.google.com/gmail/api) - Gmail Access
- [PapaParse](https://www.papaparse.com/) - CSV Parsing
- [zip.js](https://gildas-lormeau.github.io/zip.js/) - ZIP Creation
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - File Downloads
- [Tailwind CSS](https://tailwindcss.com/) - Styling (via CDN)

## 📞 Support

Made with ☕ and 💻 by me. Feel free to contact us [https://42rows.com](https://42rows.com)

---

⚠️ **Disclaimer**: This application is NOT affiliated with Google. It uses official Gmail APIs in compliance with the terms of service. The user is responsible for respecting sending limits and anti-spam policies.

© 2024 42ROWS Srl - P.IVA: 18017981004

---

**⚠️ Disclaimer**: Questa applicazione NON è affiliata con Google. Usa le API ufficiali di Gmail nel rispetto dei termini di servizio. L'utente è responsabile del rispetto dei limiti di invio e delle policy anti-spam.

---

© 2024 42ROWS Srl - P.IVA: 18017981004
