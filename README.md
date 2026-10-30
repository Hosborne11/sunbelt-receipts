# Sunbelt Receipts

A mobile app the crew installs on their phone home screen to snap and send receipts.
No login for the crew. The office signs in at `/office` to review receipts, mark them
entered, and export a CSV.

React + Vite + Supabase, deployed on Vercel.

## Setup (about 15 minutes)

### 1. Supabase
1. Use an existing Supabase project or create a new one.
2. Open **SQL Editor**, paste in `supabase/setup.sql`, and run it.
3. Add each office person who should see receipts (use the email they'll sign in with):
   ```sql
   insert into public.office_users (email) values ('you@yourcompany.com');
   ```
4. Go to **Authentication > Users > Add user** and add the same office emails. The app
   won't create accounts on its own, so only people you add can sign in.
5. Go to **Authentication > URL Configuration** and set **Site URL** to your Vercel URL
   (for example `https://sunbelt-receipts.vercel.app`). Add `https://YOUR-URL/office`
   under Redirect URLs.
6. Copy the **Project URL** and **anon public key** from **Project Settings > API**.

### 2. GitHub + Vercel
1. Create a new GitHub repo (for example `Hosborne11/sunbelt-receipts`) and push this folder.
2. In Vercel, choose **Add New > Project** and import the repo. The framework preset is Vite.
3. Add these environment variables before deploying:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

### 3. Get it on crew phones
Send the crew the link. Each person opens it once and adds it to their home screen:
- **iPhone (Safari):** Share button > **Add to Home Screen**
- **Android (Chrome):** menu (⋮) > **Install app** or **Add to Home screen**

After that it opens full screen with its own icon, just like a regular app.

## Using it
- **Crew:** tap the camera button, snap the receipt, and enter the total, vendor and job.
  Their name and last job are remembered on that phone.
- **Office:** go to `https://YOUR-URL/office`, sign in with the emailed link, and tap a
  thumbnail to see the full receipt. Use **Mark entered** once a receipt is in QuickBooks.
  **Export CSV** downloads whatever is currently filtered.

## Security notes
- Crew can only *add* receipts. They can't see, change or delete anything already sent,
  and that includes their own receipts.
- Receipt photos sit in a private bucket. Only signed-in emails listed in `office_users`
  can view them.
- Anyone who has the link can upload. If that becomes a problem, a crew access code can be
  added.

## Local development
```
cp .env.example .env   # fill in your Supabase values
npm install
npm run dev
```
