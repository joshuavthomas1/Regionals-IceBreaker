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

## Reach phones that are not on your Wi-Fi

The site runs on one computer, and that computer needs internet. Everyone else's phone can be on cellular data or another network.

1. Start the site with `npm run dev`. For the event, `npm run build` and then `npm start` is steadier.
2. In a second terminal, run `npm run share` and leave it running.
3. That prints a public https address and saves it as the badge link.
4. Print badges after that address is up.

Stopping `npm run share` closes the public address. The next run gets a different address, so print the badges again if you restart it. Scans stay in `data/icebreaker.sqlite` on the computer that is running the site.

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
