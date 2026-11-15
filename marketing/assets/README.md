# SnapPost Pro marketing assets

Short before/after demos and Pinterest pins for SnapPost Pro (snappostpro.com). Each one shows a job photo turning into a logo-branded Facebook post.

Nothing in this folder was posted anywhere. The files live on this branch so the binaries stay off `main`.

Every photo is already in this repo, or it is the Cloudinary original the site already uses for the contractor before/after. No stock photos were added.

## Specs

| | |
| --- | --- |
| Videos | 1080×1920, 12.0 seconds, 30 fps, H.264 High, yuv420p, no audio |
| Pins | 1000×1500 PNG |
| Offer on the assets | 3 free posts, no card. Then $19 or $29 a month. |
| Link | https://snappostpro.com/preview |

Prices match `shared/const.ts` (Starter $19, Pro $29). The free offer matches the public pricing page: 3 posts total, no card.

On-screen video lines, on every clip:

- “Job photo in, branded post out”
- “3 free posts, no card”
- End card: “Try it free at snappostpro.com/preview”

Motion is a slow one-direction zoom and pan. Each frame is a sub-pixel crop from the original photo, then encoded with ffmpeg (`libx264`). The camera never steps backward, which is what made the earlier GIFs look jittery.

## Videos

The logo on the contractor clip is the Airprof Studios mark from `server/fixtures/checkerboard-logo.png`, with the baked-in checkerboard removed. Other clips use the same “YOUR LOGO” corner badge the hairdresser and home pages already show. The end card uses `client/src/assets/brand/snappost-pro-logo.jpg`.

The site hero caption spells the demo business “Aiprof Studios”. These assets use “Airprof Studios” so the words match the logo on the photo.

| File | Size | Source photo | Suggested caption |
| --- | --- | --- | --- |
| `video/snappost-contractors-before-after.mp4` | 4.6 MB | Cloudinary original used by `client/src/lib/landingMockup.ts`: `https://res.cloudinary.com/dolcbe5sg/image/upload/v1786660077/snappost-pro/1-posts/1786660077398-original_a79f86b3.jpg`. Logo: `server/fixtures/checkerboard-logo.png`. | Finished the deck? SnapPost Pro turns the job photo into a logo-branded Facebook post and writes a caption you can review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-salons-before-after.mp4` | 3.5 MB | `client/src/assets/landing-carousel/salon-preview.webp` | A salon photo, your logo, and a caption ready to review. SnapPost Pro does the post prep. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-cafes-before-after.mp4` | 3.5 MB | `client/src/assets/landing-carousel/cafe-preview.webp` | Today’s counter photo can be tomorrow’s Facebook post. Add your logo, review the caption, and share it. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-florists-before-after.mp4` | 4.1 MB | `client/src/assets/landing-carousel/florist-preview.webp` | Bouquet photo in. Branded post out. SnapPost Pro adds your logo and a caption you can edit before you publish. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-pet-groomers-before-after.mp4` | 3.4 MB | `client/src/assets/landing-carousel/pet-preview.webp` | Fresh groom, branded post, before the next dog. SnapPost Pro writes the caption for you to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-restaurants-before-after.mp4` | 4.0 MB | `client/src/assets/landing-carousel/restaurant-preview.webp` | Show the room without starting the post from scratch. Logo on the photo, caption ready to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |

## Pinterest pins

Each pin pairs the same crop before and after. The after frame adds the logo badge. The URL on every pin is https://snappostpro.com/preview.

| File | Headline | Source photo | Suggested caption |
| --- | --- | --- | --- |
| `pins/pin-contractors.png` | Post the finished job before you pack up the tools | Same deck original as the contractor video, plus the Airprof Studios logo | Contractors: post the finished job before you pack up. SnapPost Pro adds your logo and a caption you can review. 3 free posts, no card, then $19 or $29 a month. https://snappostpro.com/preview |
| `pins/pin-salons.png` | Turn a salon photo into a branded Facebook post | `client/src/assets/landing-carousel/salon-preview.webp` | Salons: turn a photo of the space into a branded Facebook post. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-landscapers.png` | Show the outdoor space while it still looks finished | Same deck original, cropped tighter on the tree and outdoor space. “YOUR LOGO” badge, not the Airprof mark. | Landscapers: show the outdoor space while it still looks finished. Job photo in, branded post out. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-cafes.png` | Today's counter photo, ready for Facebook | `client/src/assets/landing-carousel/cafe-preview.webp` | Cafes: today’s counter photo, ready for Facebook. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-florists.png` | Bouquet photo in. Branded post out. | `client/src/assets/landing-carousel/florist-preview.webp` | Florists: bouquet photo in, branded post out. Review the caption, then publish when it is right. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-home-stagers.png` | A styled room, ready to share with your logo | `client/src/assets/landing-carousel/property-preview.webp` | Home stagers: a styled room, ready to share with your logo. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-pet-groomers.png` | Fresh groom to a branded post, before the next dog | `client/src/assets/landing-carousel/pet-preview.webp` | Pet groomers: fresh groom to a branded post, before the next dog. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-fitness.png` | Your studio, your logo, a caption ready to review | `client/src/assets/landing-carousel/fitness-preview.webp` | Fitness studios: your studio, your logo, a caption ready to review. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-restaurants.png` | Set the table on Facebook without starting from scratch | `client/src/assets/landing-carousel/restaurant-preview.webp` | Restaurants: set the table on Facebook without starting from scratch. 3 free posts, no card. https://snappostpro.com/preview |

## Demo media that was reviewed and not reused as a frame

These files are the existing landing promos. Titles are burned into every frame, so they are not a clean “job photo” for a before/after:

- `client/public/media/landing/contractors-promo.mp4`
- `client/public/media/landing/contractors-promo-poster.jpg`
- `client/public/media/landing/hairdressers-promo.mp4`
- `client/public/media/landing/hairdressers-promo-poster.jpg`

`client/src/assets/landing-carousel/trades-preview.jpg` is the same deck with a checkerboard still visible behind the logo. The videos and the contractor pin use the clean Cloudinary original and a fresh logo overlay instead.
