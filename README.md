# Icebreaker

A phone-first board for a conference. Each attendee gets a QR code on their name tag. Scanning it records a meeting for both people and moves them up a live leaderboard.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The badge desk is at [http://127.0.0.1:3847/admin](http://127.0.0.1:3847/admin). The local password is `badge-desk` unless you set `ADMIN_PASSWORD` (see `.env.example`). Change it before a real event.

Attendees, meetings, and check-ins are stored in `data/icebreaker.sqlite`.

## Add the room

On the badge desk:

1. Add people one at a time, or import a CSV with the header `name,company,title,fun_fact,church`. Church is `DMTC`, `CMTC`, or `STMTC`. Only `name` and `church` are required. A template is linked on the page.
2. Or load the sample attendees for a dry run.
3. Set the public link in Settings to the address phones will actually open, such as `https://icebreaker.example.com`. QR codes use that link. The print page warns you if they still point at localhost.
4. Open Print and use the browser print dialog to save a PDF for name tags. Each person also has a PNG download.

## How attendees use it

1. Check in once on their phone with the short code under their QR, or by scanning their own badge.
2. Scan other people's badges with the phone camera. The QR is a normal link, so no app install is needed.
3. The first scan of a pair counts for both people. Scanning yourself does nothing. Scanning the same person again does not add another point.
4. The board on the home page refreshes every few seconds. Scores are a fraction: people met over the other people in the room. DMTC, CMTC, and STMTC each have their own fraction at the top.

The in-page camera needs HTTPS, or localhost. Printed QR codes work from the phone's camera either way.

## Reset a dry run

Settings can clear meetings, or remove everyone. Removing people invalidates badges that were already printed.
