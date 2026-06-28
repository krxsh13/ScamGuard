# ScamGuard User Guide

Welcome to ScamGuard! This guide will help you get started protecting yourself from online scams.

---

## What is ScamGuard?

ScamGuard is a free service that helps you spot and stop online scams before they hurt you. Whether it's a fake bank call, a suspicious text message, or a tricky email, ScamGuard uses artificial intelligence to analyze the content and tell you whether it's likely a scam. We created ScamGuard because millions of people lose money to scams every year—and many of these scams are preventable if you know what to look for.

---

## Key Features

### 🔍 **Scam Checker**
Paste any suspicious message, link, or text, and ScamGuard will analyze it instantly to tell you if it looks like a scam.

### 🔗 **URL Checker**
Suspicious link? Paste it here and check if it's safe before clicking. We scan against known phishing databases.

### 📸 **Image Scanner**
Screenshot a suspicious message or email? Upload it and our AI will read the text and check if it's a scam.

### 📚 **Learn About Scams**
New to this? Browse our education section to learn:
- How fake phone calls work and what to listen for
- How to spot phishing messages
- Common email scams and red flags
- Social engineering tricks

### 🎓 **Quiz Yourself**
Test your scam-spotting skills with our interactive quiz. Learn from real examples and improve your defenses.

---

## Getting Started (5 minutes)

### Step 1: Create Your Account
1. Click **"Sign Up"** on the home page
2. Enter your email and create a strong password
3. Click **"Register"**

### Step 2: Verify Your Email
1. Check your email inbox (sometimes it goes to spam)
2. Click the verification link
3. Done! You're ready to use ScamGuard

### Step 3: Log In
1. Click **"Log In"** on the home page
2. Enter your email and password
3. You're in!

> **Tip:** Your login stays active on this device, so you don't have to sign in every time.

---

## How to Check Something for Scams

### **Option 1: Check a Message or Text**
1. Go to the **"Scam Checker"** tab
2. Select **"Message/Text"**
3. Copy and paste the suspicious message
4. Click **"Analyze"**
5. Wait for the results (usually 5-15 seconds)

### **Option 2: Check a Link**
1. Go to the **"Scam Checker"** tab
2. Select **"Link"**
3. Paste the suspicious URL
4. Click **"Analyze"**
5. See if it's flagged as unsafe

### **Option 3: Check an Image**
1. Go to the **"Scam Checker"** tab
2. Select **"Image"**
3. Upload a screenshot of the message or email
4. Click **"Analyze"**
5. Our AI reads the text and checks it for you

---

## Understanding Your Risk Score

After ScamGuard analyzes something, you'll see one of three risk levels:

### 🟢 **LOW RISK**
This looks safe. It's probably not a scam. Use it normally, but stay cautious.
- Example: A message from a verified account with normal language

### 🟡 **MEDIUM RISK**
Proceed with caution. This has some warning signs, but might be legitimate.
- Example: An urgent request with a suspicious link, but familiar language
- **What to do:** Don't click links. Call the organization directly using the number on their official website.

### 🔴 **HIGH RISK**
This is very likely a scam. Don't interact with it.
- Example: Poor spelling, urgent pressure, asking for personal information, fake domain name
- **What to do:** Delete it, report it as spam/phishing, and block the sender.

---

## What Red Flags Does ScamGuard Look For?

Our AI watches for:
- ❌ Requests for passwords, PINs, or personal ID numbers
- ❌ Pressure to act immediately ("Your account will close in 24 hours!")
- ❌ Fake links or misspelled domain names
- ❌ Poor spelling and grammar
- ❌ Threats or scary language
- ❌ Offers of prizes you didn't enter
- ❌ Requests for payment upfront
- ❌ Unusual sender addresses or numbers

---

## Running ScamGuard Locally (For Developers)

### Prerequisites
Make sure you have:
- **Docker** and **Docker Compose** installed on your computer
- About 5 GB of free disk space
- A modern web browser

### Quick Start

**1. Open terminal/command prompt and navigate to the project:**
```bash
cd path/to/ScamGuard
```

**2. Start everything with one command:**
```bash
docker-compose up --build
```

This starts:
- **Frontend** (the app you see) at `http://localhost:3000`
- **Backend** (the API) at `http://localhost:4000`
- **AI Service** (the brain) at `http://localhost:8000`
- **Database** (MongoDB) automatically
- **Cache** (Redis) automatically

**3. Open your browser:**
Go to `http://localhost:3000` and you'll see ScamGuard running.

**4. Stop everything:**
Press `Ctrl+C` in the terminal.

### That's it!
No complicated setup. No manual database creation. Docker handles everything.

---

## Need Help?

### Report a Scam to Authorities

If you've been scammed or encountered a scam, report it immediately:

**📞 India Cyber Crime Helpline**
- Phone: **1930** (toll-free)
- Website: **cybercrime.gov.in**
- This is the official government hotline for cybercrime

**🏦 If Money Was Involved**
- Contact your bank immediately
- File a complaint with your local police
- Report to the cybercrime helpline

### Common Questions

**Q: Does ScamGuard protect my data?**
A: Yes! Your scans are encrypted and automatically deleted after 90 days. We follow GDPR rules strictly.

**Q: Can I delete my account and all my data?**
A: Absolutely. Go to your account settings and request "Right to Erasure." Your data will be permanently deleted.

**Q: What if ScamGuard gives a wrong result?**
A: ScamGuard isn't perfect (no AI is), but it's very accurate. If you think it missed something, you can:
- Learn more in our education section
- Report the result to help us improve
- Always use your own judgment

**Q: Is this really free?**
A: Yes, completely free. No hidden costs, no premium features.

**Q: Do I need to install anything?**
A: No! Just visit `http://localhost:3000` in your browser. Everything is web-based.

---

## Safety Tips (General)

Even without ScamGuard, follow these rules to stay safe:

✅ **DO:**
- Call organizations directly using official phone numbers
- Look for secure connections (https://) and padlock icons
- Use strong, unique passwords
- Enable two-factor authentication
- Take time to think before acting

❌ **DON'T:**
- Click links in suspicious emails or texts
- Share personal information (passwords, PINs, ID numbers)
- Pay fees for prizes you didn't enter
- Trust caller ID (it can be faked)
- Panic (scammers use fear and urgency as weapons)

---

## About Us

ScamGuard was built to fight back against online fraud in India and worldwide. Our team includes:
- Security experts
- AI engineers
- Real cybercrime survivors

We believe everyone deserves to feel safe online.

---

## Have Feedback?

Found a bug? Have a feature idea? Want to help?
- Visit our GitHub repository
- Email us with feedback
- Share your scam-spotting success stories!

---

## One More Thing

**You are not alone if you've been scammed.** It happens to smart people every day. Scammers are professionals at manipulation. Getting scammed is not your fault. But from now on, with tools like ScamGuard and the knowledge in this guide, you'll be much better prepared.

Stay safe. Stay smart. You've got this. 🛡️

---

**Last updated: April 2026**
