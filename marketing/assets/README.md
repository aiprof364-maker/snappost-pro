# SnapPost Pro marketing assets

Short before/after demos and Pinterest pins for SnapPost Pro (snappostpro.com). Each one shows a job photo turning into a logo-branded Facebook post: the business logo sits in the lower right of the photo, and a caption card sits with the post.

Nothing in this folder was posted anywhere. The files live on this branch so the binaries stay off `main`.

Every photo is already in this repo, or it is the Cloudinary original the site already uses for the contractor before/after. No stock photos were added.

The names on the posts (Halo Room, Northfield Yard, Maple & Rye, and the rest) are made-up example brands, in the same role as Airprof Studios on the contractor demo. They are not real customers.

## Specs

| | |
| --- | --- |
| Videos | 1080×1920, 12.0 seconds, 30 fps, H.264 High, yuv420p, no audio |
| Pins | 1000×1500 PNG |
| Logo size | The same box the product uses: at most 16% of the photo width and 20% of the photo height, with a 3% margin, lower right (`server/branding.ts`) |
| Offer on the assets | 3 free posts, no card. Then $19 or $29 a month. |
| Link | https://snappostpro.com/preview |

Prices match `shared/const.ts` (Starter $19, Pro $29). The free offer matches the public pricing page: 3 posts total, no card.

On-screen video lines, on every clip:

- “Job photo in, branded post out”
- “3 free posts, no card”
- End card: “Try it free at snappostpro.com/preview”

Motion is a slow one-direction zoom and pan. Each frame is a sub-pixel crop from the original photo, then encoded with ffmpeg (`libx264`). The camera never steps backward.

## Example brands

| Trade | Example brand | Where it appears |
| --- | --- | --- |
| Contractors | Airprof Studios | Existing mark in `server/fixtures/checkerboard-logo.png`, checkerboard removed |
| Salons | Halo Room | Made-up example mark |
| Landscapers | Northfield Yard | Made-up example mark |
| Cafes | Maple & Rye | Made-up example mark |
| Florists | Bramble & Co | Made-up example mark |
| Home stagers | Stillroom | Made-up example mark |
| Pet groomers | Tidy Hound | Made-up example mark |
| Fitness studios | Lane Forty | Made-up example mark |
| Restaurants | Ember Room | Made-up example mark |

## Videos

The end card uses `client/src/assets/brand/snappost-pro-logo.jpg`.

The site hero caption spells the demo business “Aiprof Studios”. These assets use “Airprof Studios” so the words match the logo on the photo.

| File | Size | Source photo | Example brand | Suggested caption |
| --- | --- | --- | --- | --- |
| `video/snappost-contractors-before-after.mp4` | 4.6 MB | Cloudinary original used by `client/src/lib/landingMockup.ts`: `https://res.cloudinary.com/dolcbe5sg/image/upload/v1786660077/snappost-pro/1-posts/1786660077398-original_a79f86b3.jpg` | Airprof Studios | Finished the deck? SnapPost Pro turns the job photo into a logo-branded Facebook post and writes a caption you can review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-salons-before-after.mp4` | 2.1 MB | `client/src/assets/landing-carousel/salon-preview.webp` | Halo Room | A salon photo, an example logo, and a caption ready to review. SnapPost Pro does the post prep. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-cafes-before-after.mp4` | 2.1 MB | `client/src/assets/landing-carousel/cafe-preview.webp` | Maple & Rye | Today’s counter photo can be tomorrow’s Facebook post. The example shows a logo and a caption ready to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-florists-before-after.mp4` | 4.0 MB | `client/src/assets/landing-carousel/florist-preview.webp` | Bramble & Co | Bouquet photo in. Branded post out. SnapPost Pro adds the logo and a caption you can edit before you publish. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-pet-groomers-before-after.mp4` | 1.9 MB | `client/src/assets/landing-carousel/pet-preview.webp` | Tidy Hound | Fresh groom, branded post, before the next dog. SnapPost Pro writes the caption for you to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-restaurants-before-after.mp4` | 2.4 MB | `client/src/assets/landing-carousel/restaurant-preview.webp` | Ember Room | Show the room without starting the post from scratch. Logo on the photo, caption ready to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |
| `video/snappost-landscapers-before-after.mp4` | 5.2 MB | Same deck original as the contractor clip, cropped tighter on the tree and outdoor space | Northfield Yard | Landscapers: show the finished outdoor space while it still looks fresh. Logo and caption, ready to review. 3 free posts, no card. Try it free at https://snappostpro.com/preview |

## Pinterest pins

Each pin pairs the same crop before and after. The after frame is the branded post: logo in the lower right, then the caption card with the example business name. The URL on every pin is https://snappostpro.com/preview.

| File | Headline | Source photo | Example brand | Suggested caption |
| --- | --- | --- | --- | --- |
| `pins/pin-contractors.png` | Post the finished job before you pack up the tools | Deck original above | Airprof Studios | Contractors: post the finished job before you pack up. SnapPost Pro adds your logo and a caption you can review. 3 free posts, no card, then $19 or $29 a month. https://snappostpro.com/preview |
| `pins/pin-salons.png` | Turn a salon photo into a branded Facebook post | `client/src/assets/landing-carousel/salon-preview.webp` | Halo Room | Salons: turn a photo of the space into a branded Facebook post. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-landscapers.png` | Show the outdoor space while it still looks finished | Deck original, tighter crop on the tree | Northfield Yard | Landscapers: show the outdoor space while it still looks finished. Job photo in, branded post out. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-cafes.png` | Today's counter photo, ready for Facebook | `client/src/assets/landing-carousel/cafe-preview.webp` | Maple & Rye | Cafes: today’s counter photo, ready for Facebook. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-florists.png` | Bouquet photo in. Branded post out. | `client/src/assets/landing-carousel/florist-preview.webp` | Bramble & Co | Florists: bouquet photo in, branded post out. Review the caption, then publish when it is right. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-home-stagers.png` | A styled room, ready as a branded post | `client/src/assets/landing-carousel/property-preview.webp` | Stillroom | Home stagers: a styled room, ready as a branded post. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-pet-groomers.png` | Fresh groom to a branded post, before the next dog | `client/src/assets/landing-carousel/pet-preview.webp` | Tidy Hound | Pet groomers: fresh groom to a branded post, before the next dog. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-fitness.png` | Your studio, branded, with a caption to review | `client/src/assets/landing-carousel/fitness-preview.webp` | Lane Forty | Fitness studios: your studio, branded, with a caption ready to review. 3 free posts, no card. https://snappostpro.com/preview |
| `pins/pin-restaurants.png` | Set the table on Facebook without starting from scratch | `client/src/assets/landing-carousel/restaurant-preview.webp` | Ember Room | Restaurants: set the table on Facebook without starting from scratch. 3 free posts, no card. https://snappostpro.com/preview |

## Photos that were not available

SnapPost’s site lists cleaners and car detailers as trades, but neither the repo nor snappostpro.com has a SnapPost-owned photo of that work. No cleaner or auto-detailer pin or clip was made.

## Demo media that was reviewed and not reused as a frame

These files are the existing landing promos. Titles are burned into every frame, so they are not a clean “job photo” for a before/after:

- `client/public/media/landing/contractors-promo.mp4`
- `client/public/media/landing/contractors-promo-poster.jpg`
- `client/public/media/landing/hairdressers-promo.mp4`
- `client/public/media/landing/hairdressers-promo-poster.jpg`

`client/src/assets/landing-carousel/trades-preview.jpg` is the same deck with a checkerboard still visible behind the logo. The contractor assets use the clean Cloudinary original and a fresh Airprof overlay instead.
