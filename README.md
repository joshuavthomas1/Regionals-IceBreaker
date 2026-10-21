# Icebreaker

A phone-first board for a conference. Each attendee gets a QR code on their name tag. Scanning it records a meeting for both people and moves them up a live leaderboard.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The badge desk is at [http://127.0.0.1:3847/admin](http://127.0.0.1:3847/admin). The local password is `badge-desk` unless you set `ADMIN_PASSWORD` (see `.env.example`). Change it before a real event.

Attendees, meetings, and check-ins are stored in Supabase. Copy `.env.example` to `.env` and set `DATABASE_URL` to the Supabase pooler connection string (port 6543) before starting the app.

## Stay online without a laptop

1. Create a Supabase project and put its pooler connection string in `DATABASE_URL`.
2. Import this repo on Vercel and add `DATABASE_URL` and `ADMIN_PASSWORD` as environment variables.
3. Deploy. Open `/admin` on the Vercel address, set the public link to that same `https://….vercel.app` address, then print badges.

That address stays up when your laptop is off. A free Supabase project goes to sleep after about a week of nobody using it, so open the project in the Supabase dashboard a day or two before the event.

`npm run share` is only for a temporary public link from a computer you leave running. The Vercel address is the one to print on badges.

## Add the room

On the badge desk:

1. Add people one at a time, or import a CSV with the header `name,fun_fact,church`. Church is `DMTC`, `CMTC`, or `STMTC`. Name and church are required. A template is linked on the page.
2. Or load the sample attendees for a dry run.
3. Run `npm run share`, or paste a public address you already have into Settings. QR codes use that link. The print page warns you if they still point at this computer.
4. Open Print and use the browser print dialog to save a PDF for name tags. Each person also has a PNG download.

## How attendees use it

1. Check in once on their phone with the short code under their QR, or by scanning their own badge.
2. Scan other people's badges with the phone camera. The QR is a normal link, so no app install is needed.
3. The first scan of a pair counts for both people. Scanning yourself does nothing. Scanning the same person again does not add another point.
4. The board on the home page refreshes every few seconds. A score is people met over everyone else on the list. Your own church leaves you out of its denominator, and the three church denominators add up to your overall total.

The in-page camera needs HTTPS, or localhost. Printed QR codes work from the phone's camera either way.

## Reset a dry run

Settings can clear meetings, or remove everyone. Removing people invalidates badges that were already printed.
