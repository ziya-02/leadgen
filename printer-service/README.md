# Printer Service Portal (QR complaints)

Each printer has its own QR sticker. A client scans it and reports a problem without logging in. The admin assigns the complaint to a technician. The technician records arrival and departure times, the service done, parts replaced, the meter reading and photos, then exports a PDF report for the day. The portal works in English and Arabic (RTL).

| Page | Who | What |
|---|---|---|
| `complaint.html?p=<printer-id>` | Client (opened from the QR) | Complaint form with printer details already filled in, problem type and photos. The client gets a ticket number. |
| `track.html` | Client | Check a complaint's status by ticket number |
| `admin.html` | Admin | Complaints (assign, WhatsApp, cancel), printers (CSV/Excel import, QR label printing), technicians (add, enable/disable, daily PDF), settings (logo, company details) |
| `tech.html` | Technician | My jobs, "I've arrived" (records arrival time), service report, WhatsApp the client, export the day's PDF |

## 1. Try it now (demo mode)

With `js/config.js` left as it is, the app runs in **demo mode**: all data is kept in your browser, with nothing to set up.

```bash
cd printer-service
python3 -m http.server 8080      # any static web server works
# open http://localhost:8080
```

- Admin: `admin@demo.com` / `demo123`
- Technician: `tech1@demo.com` / `demo123`
- Client form: `http://localhost:8080/complaint.html?p=CN-12345`

> Pages use ES modules, so open them through a web server, not by double-clicking the file.

## 2. Add your printers (CSV / Excel)

1. Admin → **Printers** → **Download template**.
2. Paste your printer list into it, one row per printer. Only **Serial No** is required.

   `Serial No | Brand | Model | Client Name | Client Phone | Client Email | Location`

3. Click **Import CSV / Excel** and choose the `.xlsx` or `.csv` file. You can import thousands of rows at once.
   - Columns are matched by name, so headers such as `Serial Number`, `SN`, `Customer` or `Branch` also work.
   - Importing a serial number that already exists **updates** that printer, so you can re-upload your master list whenever it changes.
4. Select printers, or leave none selected to use the current filter, then click **Print QR labels**. The labels print 3 per row on A4, ready for sticker paper.

`sample-printers.csv` is an example file.

> **Set the Portal URL first.** Admin → Settings → Portal URL is the address written inside every QR code. Set it to your real domain *before* printing stickers.

## 3. Go live with Firebase (free)

1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication** → Get started → enable **Email/Password**.
3. **Build → Firestore Database** → Create database (production mode).
4. **Project settings → General → Your apps → Web app (</>)**. Copy the `firebaseConfig` values into `js/config.js` → `firebase`.
5. Create the **admin** account:
   - Authentication → Users → **Add user** (your e-mail and password), then copy the new user's **UID**.
   - Firestore → **Start collection** `users` → Document ID = *that UID* → fields: `role` (string) = `admin`, `name` (string) = your name.
6. Deploy the security rules and the site, using the [Firebase CLI](https://firebase.google.com/docs/cli):

   ```bash
   npm install -g firebase-tools
   firebase login
   cd printer-service
   firebase use --add            # pick your project
   firebase deploy --only firestore:rules,hosting
   ```

   The site will be at `https://<project-id>.web.app`. Put that address in Admin → Settings → Portal URL.
   You can also host the folder anywhere else (cPanel, Netlify and so on) and run `firebase deploy --only firestore:rules`.
7. Log in at `admin.html`, fill in **Settings** (company name, logo, phone, e-mail), add **Technicians**, and import your **Printers**.

Technicians are created from the admin portal; you don't add them in the Firebase console. To remove a technician, untick **Active**.

### Photos
- `inlinePhotos: true` (default): photos are compressed to about 60–100 KB and saved inside the database. This works on the free **Spark** plan with no billing card. Each complaint and each report can have up to 4 photos.
- `inlinePhotos: false`: full-size photos go to **Firebase Storage**. Storage needs the pay-as-you-go **Blaze** plan, which is still free at low usage. Enable Storage in the console and deploy `storage.rules` (`firebase deploy --only storage`).

## 4. Alerts

**WhatsApp (free, click-to-send).** These buttons open WhatsApp with the message already written:
- Admin → complaint → **WhatsApp technician** (job details) and **WhatsApp client** (acknowledgement and tracking link)
- Technician → **Tell client I'm on my way**, and **Send completion to client** after saving the report
- Client → WhatsApp the company after submitting

Phone numbers should include the country code (for example `+9715…`).

**E-mail (optional, automatic)** uses [EmailJS](https://www.emailjs.com/) (free: 200 e-mails/month):
1. Create an e-mail service and a template. Set the template's *To* field to `{{to_email}}`, the subject to `{{subject}}` and the body to `{{message}}`.
2. Paste the public key, service ID and template ID into `js/config.js` → `emailjs`.

E-mails are sent in three cases:
- a new complaint, to the company e-mail set in Settings;
- a job assignment, to the technician;
- a completed job, to the client, if they gave an e-mail address.

## Data & security (Firestore)

| Collection | Contents | Access |
|---|---|---|
| `printers` | Printer list | Anyone can read **one** printer by its ID (the QR). Only admin can list or edit. |
| `complaints` | Full complaint plus service report | Anyone can **create** a new complaint for a registered printer. Admin has full access. A technician can see and update only jobs assigned to them, and only the report and status fields. |
| `tickets` | Status-only copy, with no phone or e-mail | Readable by ticket number, for the Track page |
| `users` | Admin and technician profiles (`role`) | Admin |
| `settings/main` | Company name, logo, phone, portal URL | Public read, admin write |

## Files

```
index.html  complaint.html  track.html  admin.html  tech.html
css/app.css
js/config.js     ← your settings (Firebase, EmailJS, language, photos)
js/db.js         data layer (Firebase or demo)
js/i18n.js       English / Arabic text
js/ui.js, js/views.js, js/notify.js, js/pdf.js
js/complaint.js  js/admin.js  js/tech.js
firestore.rules  storage.rules  firebase.json  sample-printers.csv
```
