import { PLAN_POST_LIMITS, PLANS } from "./const";
import {
  TRADE_LANDING_NAV,
  type TradeLandingId,
  type TradeLandingNavItem,
} from "./tradeLandingNav";

export const SITE_ORIGIN = "https://snappostpro.com";

export const SITE_DEFAULT_TITLE =
  "SnapPost Pro — Branded Facebook posts for local businesses";

export const SITE_DEFAULT_DESCRIPTION =
  "SnapPost Pro turns photos of your work, products, spaces or results into branded, caption-ready Facebook posts for local businesses.";

export type TradeExample = {
  title: string;
  photo: string;
  caption: string;
  hashtags: string;
};

export type TradeFaq = {
  question: string;
  answer: string;
};

export type TradeStep = {
  title: string;
  description: string;
};

export type TradeLandingPage = TradeLandingNavItem & {
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  exampleHeading: string;
  exampleIntro: string;
  examples: readonly TradeExample[];
  stepsHeading: string;
  steps: readonly TradeStep[];
  faqs: readonly TradeFaq[];
  closingHeading: string;
  closingBody: string;
};

const PRICING_ANSWER = `You can create ${PLAN_POST_LIMITS.free} Facebook posts free, and no card is required. After that, Starter is ${PLANS.starter.priceLabel} for ${PLANS.starter.postsPerMonth.replace(" / ", " per ")} and Pro is ${PLANS.pro.priceLabel} for ${PLANS.pro.postsPerMonth.replace(" / ", " per ")}.`;

const PAGE_LATER =
  "No. Make the preview from a photo first. Add a logo only if you have one. Connect a Facebook Page, or follow the steps to create one, when you decide to publish.";

function page(
  id: TradeLandingId,
  content: Omit<TradeLandingPage, "id" | "path" | "label" | "previewLanding">
): TradeLandingPage {
  const nav = TRADE_LANDING_NAV.find(item => item.id === id);
  if (!nav) throw new Error(`Missing trade nav for ${id}`);
  return { ...nav, ...content };
}

export const contractorsPage = page("contractors", {
  title: "Facebook Post Ideas for Contractors | SnapPost Pro",
  description:
    "Facebook post ideas for contractors, made from finished-job photos. Add your logo, review the caption, and start with 3 free posts. No card required.",
  h1: "Facebook post ideas for contractors",
  eyebrow: "For contractors — no Page or logo needed to start",
  intro:
    "You already take the photo when the job is done. SnapPost Pro turns a finished deck, kitchen, roof, or repair into a Facebook post with your logo, if you have one, and a caption you can edit before it goes on your Page.",
  exampleHeading: "Posts you can make from the job you just finished",
  exampleIntro:
    "Use a photo you took on the job. These captions are examples of what you would review and edit. They are not posts from real customers.",
  examples: [
    {
      title: "Finished deck or porch",
      photo:
        "A wide shot of the completed deck, porch, or stairs in daylight, with the tools packed up.",
      caption:
        "Another deck is finished and ready for the weekend. Built straight, sealed, and ready for the first cookout.",
      hashtags: "#DeckBuilder #OutdoorLiving #LocalContractor",
    },
    {
      title: "Kitchen or bath remodel",
      photo:
        "The room after the last fixture is in. Include the new cabinets or tile, not a pile of demo debris.",
      caption:
        "New cabinets, new counters, and a kitchen this household can actually cook in. Another remodel wrapped this week.",
      hashtags: "#KitchenRemodel #BathroomRemodel #HomeRenovation",
    },
    {
      title: "Roof, siding, or repair",
      photo:
        "The repaired section from the ground or a safe vantage point. Skip ladder selfies and open attics full of personal items.",
      caption:
        "Storm damage repaired and the roof is watertight again. If your place needs the same look, send a photo of the problem.",
      hashtags: "#RoofRepair #Siding #HomeRepair",
    },
  ],
  stepsHeading: "From completed job to Facebook post",
  steps: [
    {
      title: "Upload a finished-job photo",
      description:
        "Use a real photo of work you want on your Facebook Page. One clear shot of the finished job is enough.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. The post draft is ready with or without a logo on the photo.",
    },
    {
      title: "Review the caption",
      description:
        "SnapPost Pro writes a caption from the photo. Change the town, the scope, or the call to action before you publish.",
    },
    {
      title: "Connect or create a Facebook Page",
      description:
        "Choose the Page when the post is ready. No Page yet? We show you how to create one.",
    },
  ],
  faqs: [
    {
      question: "What are good Facebook post ideas for contractors?",
      answer:
        "Post the job you just finished: a deck, kitchen, roof, bathroom, paint job, or repair. One clear photo, your logo if you have it, and a short note about the work are enough. You do not need a separate photo shoot.",
    },
    {
      question: "Do contractors need a Facebook Page or logo to start?",
      answer: PAGE_LATER,
    },
    {
      question: "How much does SnapPost Pro cost for a contractor?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Can I edit the caption before it goes on my Page?",
      answer:
        "Yes. Every caption is a draft. Nothing is published until you choose a Facebook Page and post it yourself.",
    },
  ],
  closingHeading: "Post the job you finished today.",
  closingBody:
    "See the branded post before you enter an email. Then sign up for 3 free posts. No card required.",
});

export const landscapersPage = page("landscapers", {
  title: "Facebook Post Ideas for Landscapers | SnapPost Pro",
  description:
    "Facebook post ideas for landscapers, from mowing, planting, and patio photos. Review the caption and start with 3 free posts. No card required.",
  h1: "Facebook post ideas for landscapers",
  eyebrow: "For landscapers — no Page or logo needed to start",
  intro:
    "A fresh bed, a sharp edge, or a new patio is already the post. Upload that photo, add your logo if you have one, and review a caption written for a landscaping company. Put it on your Facebook Page while the work still looks finished.",
  exampleHeading: "Posts you can make from a yard you already finished",
  exampleIntro:
    "Photograph the work, not the client's whole house. These captions are examples for you to adapt. They are not reviews or posts from real customers.",
  examples: [
    {
      title: "Mulch, beds, and edging",
      photo:
        "A bed after the mulch is down and the edges are cut. Leave house numbers and family items out of the frame.",
      caption:
        "Fresh mulch, clean edges, and a bed that looks finished. This is the kind of Saturday project neighbors notice from the sidewalk.",
      hashtags: "#Landscaping #Mulch #CurbAppeal",
    },
    {
      title: "Patio or walkway",
      photo:
        "The hardscape after the last sweep, with the lines of the pavers or stone visible.",
      caption:
        "New patio, solid base, and a place to sit outside tonight. Hardscape work holds up when the prep underneath is done right.",
      hashtags: "#Hardscape #Patio #LandscapeDesign",
    },
    {
      title: "Seasonal cleanup or weekly route",
      photo:
        "A lawn after the mow and blow, or a fall cleanup with beds clear and the walk open.",
      caption:
        "Lawn mowed, beds cleared, and the walkway open again. Weekly maintenance keeps the property looking cared for between bigger projects.",
      hashtags: "#LawnCare #SeasonalCleanup #Landscaper",
    },
  ],
  stepsHeading: "From finished yard to Facebook post",
  steps: [
    {
      title: "Upload the yard you just finished",
      description:
        "A phone photo of the bed, lawn, or hardscape is enough. Skip faces, addresses, and anything the client asked you not to show.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. Crews without a logo file can still get a caption and a post preview.",
    },
    {
      title: "Review the caption",
      description:
        "Add the service and the town in your own words. SnapPost Pro drafts the rest from the photo.",
    },
    {
      title: "Publish when the route allows",
      description:
        "Connect a Facebook Page, or create one, only when you are ready to post.",
    },
  ],
  faqs: [
    {
      question: "What should a landscaping company post on Facebook?",
      answer:
        "Post work people recognize from the street: fresh mulch, a mowed and edged lawn, a planting, a patio, or a seasonal cleanup. A photo taken when you finish is the post. You do not need a drone or a designer.",
    },
    {
      question: "Can I post a photo of a customer's yard?",
      answer:
        "Only with permission. Leave out house numbers, faces, and anything that identifies the household. A tight photo of the planting or the hardscape is usually enough.",
    },
    {
      question: "How much does SnapPost Pro cost for a landscaper?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Do I need design skills to make the post?",
      answer:
        "No. SnapPost Pro places your logo if you upload one and writes a caption from the photo. You review the words before anything is published.",
    },
  ],
  closingHeading: "Post the yard while it still looks finished.",
  closingBody:
    "Create the preview from today's photo, then sign up for 3 free posts. No card required.",
});

export const hairdressersPage = page("hairdressers", {
  title: "Facebook Post Ideas for Salons | SnapPost Pro",
  description:
    "Facebook post ideas for salons and hairdressers. Turn a color, cut, or shop photo into a branded post. 3 free posts, no card required.",
  h1: "Facebook post ideas for salons and hairdressers",
  eyebrow: "For salons and hairdressers — no Page or logo needed to start",
  intro:
    "People book a salon because they can picture the result. Upload a style you have permission to share, your station, or the shop before you open. SnapPost Pro adds your logo if you want it and drafts a caption you edit before it goes on your Facebook Page.",
  exampleHeading: "Posts you can make between appointments",
  exampleIntro:
    "Use photos you have the right to publish. These captions are examples, not reviews or posts from real salons.",
  examples: [
    {
      title: "The salon before you open",
      photo:
        "Your chair, mirrors, or waiting area in good light. A photo of the space does not require a client's permission.",
      caption:
        "Chairs set, color bar stocked, and the shop ready for the day. Appointments are open this week if you have been waiting on a refresh.",
      hashtags: "#SalonLife #HairSalon #BookYourAppointment",
    },
    {
      title: "A color or cut you can share",
      photo:
        "The finished style only when the client has agreed. Crop out other people in the mirror.",
      caption:
        "A soft refresh that still feels like them. Color, cut, and a finish they can wear to work tomorrow.",
      hashtags: "#HairColor #Haircut #SalonStyle",
    },
    {
      title: "A product you already retail",
      photo:
        "The bottle or jar on your counter, next to a clean station. You do not need a model.",
      caption:
        "The shampoo and styler we send people home with after a color. Ask which one fits your hair at your next visit.",
      hashtags: "#Haircare #SalonRetail #HealthyHair",
    },
  ],
  stepsHeading: "From salon photo to Facebook post",
  steps: [
    {
      title: "Upload a salon photo",
      description:
        "A finished style you have permission to publish, a product, or your space. Skip other clients in the background.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. A post draft is ready with or without a logo on the photo.",
    },
    {
      title: "Review the caption",
      description:
        "Fix the service name and the booking note. You decide whether the wording sounds like your shop.",
    },
    {
      title: "Connect or create a Facebook Page",
      description:
        "Publish when the book has room. No Page yet? We show you how to create one.",
    },
  ],
  faqs: [
    {
      question: "What are good Facebook post ideas for a salon?",
      answer:
        "A finished color or cut you have permission to show, your chair or shampoo area, a product you retail, or the salon before you open. One useful photo a few times a week is more practical than a full shoot.",
    },
    {
      question: "Do I have to show a client's face?",
      answer:
        "No. Get a clear yes before you show a client. Photos of your space, your tools, or your own hair avoid that question.",
    },
    {
      question: "How much does SnapPost Pro cost for a salon?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Do hairdressers need a logo and a Page to try it?",
      answer: PAGE_LATER,
    },
  ],
  closingHeading: "Post the work between clients.",
  closingBody:
    "Preview the post from a photo you already have, then sign up for 3 free posts. No card required.",
});

export const foodTrucksPage = page("food-trucks", {
  title: "Social Media for Food Trucks | SnapPost Pro",
  description:
    "Social media for food trucks: turn today's special, truck, or line photo into a Facebook post. Start with 3 free posts. No card required.",
  h1: "Social media for food trucks",
  eyebrow: "For food trucks — no Page or logo needed to start",
  intro:
    "Regulars need three things: where you are parked, how long you are there, and what is on the window. Take that photo when you set up. SnapPost Pro drafts a branded Facebook post and a caption you can fix with today's stop and hours.",
  exampleHeading: "Facebook posts for a truck that is already open",
  exampleIntro:
    "Put the real stop and the real hours in before you publish. These captions are examples, not posts from a real truck.",
  examples: [
    {
      title: "Today's stop and hours",
      photo:
        "The truck at the location, with the service window or the sign in frame. Take it when you arrive.",
      caption:
        "Parked and serving until 2. Today's menu is on the board. Come by before the special sells out.",
      hashtags: "#FoodTruck #FoodTruckLife #Lunch",
    },
    {
      title: "The special on the window",
      photo:
        "A close photo of the plate or the tray you are actually selling today. Use your own food photo.",
      caption:
        "Today's special is on the window. Same truck, new plate, and we are cooking it to order until we run out.",
      hashtags: "#StreetFood #FoodTruckSpecial #EatLocal",
    },
    {
      title: "Catering or a booked event",
      photo:
        "The setup at the event, without guest faces unless you have permission to show them.",
      caption:
        "Serving a private event tonight. If you need the truck for a workplace lunch or a weekend party, tell us the date and the headcount.",
      hashtags: "#FoodTruckCatering #EventCatering #FoodTruck",
    },
  ],
  stepsHeading: "From the parking spot to a Facebook post",
  steps: [
    {
      title: "Upload today's photo",
      description:
        "The truck, the special, or the line. A photo from your phone at the stop is the right one.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. Many trucks already have the name on the vehicle. A logo file is not required to start.",
    },
    {
      title: "Put the real stop in the caption",
      description:
        "SnapPost Pro drafts the wording. You add the location, the hours, and anything that sold out.",
    },
    {
      title: "Post before the rush",
      description:
        "Connect a Facebook Page, or create one, and publish when the window is open.",
    },
  ],
  faqs: [
    {
      question: "What should a food truck post on Facebook?",
      answer:
        "Where you are parked, when you leave, and what you are serving. A photo of the special, the window, or the truck at the stop is the post. Put the hours in the caption so people do not have to guess.",
    },
    {
      question: "How do I post when I am too busy to write?",
      answer:
        "Take the photo when you park. SnapPost Pro drafts the caption. You correct the location and the time, then publish when the line allows.",
    },
    {
      question: "How much does SnapPost Pro cost for a food truck?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Can I use a menu photo I did not take?",
      answer:
        "Use photos you took or have permission to publish. A picture of your own truck, board, or plate is the straightforward choice.",
    },
  ],
  closingHeading: "Tell people where the truck is today.",
  closingBody:
    "Turn the photo you just took into a post preview, then sign up for 3 free posts. No card required.",
});

export const realtorsPage = page("realtors", {
  title: "Facebook Post Ideas for Realtors | SnapPost Pro",
  description:
    "Facebook post ideas for realtors, made from listing and open-house photos. Review the caption and start with 3 free posts. No card required.",
  h1: "Facebook post ideas for realtors",
  eyebrow: "For realtors — no Page or logo needed to start",
  intro:
    "Listing photos and open-house shots are already on your phone. SnapPost Pro turns one of them into a branded Facebook post and a caption you review. You still follow your brokerage's advertising rules before anything is published.",
  exampleHeading: "Posts you can make from photos you already have",
  exampleIntro:
    "Do not publish a price, address, or status you have not confirmed. These captions are examples, not listings from a real agent.",
  examples: [
    {
      title: "A room that is ready to show",
      photo:
        "One strong listing photo: a living room, kitchen, or exterior in daylight. Use a photo you have the right to post.",
      caption:
        "A welcoming room, staged and ready for the next showing. Message me if you want the full photo set and the showing times.",
      hashtags: "#JustListed #OpenHouse #RealEstate",
    },
    {
      title: "Open house this weekend",
      photo:
        "The front exterior or the main room, plus a caption that states the day and the hours you will actually be there.",
      caption:
        "Open house this weekend. Come walk the house, see the light in the main rooms, and ask the questions you would not put in a comment.",
      hashtags: "#OpenHouse #HomeForSale #Realtor",
    },
    {
      title: "Just sold, without the private details",
      photo:
        "An exterior or a room you are allowed to keep using after closing. Leave personal belongings out.",
      caption:
        "Sold and closed. Congratulations to the buyers. If you are thinking about a sale in the same area, I can walk you through what this one took.",
      hashtags: "#JustSold #RealEstateAgent #HomeSold",
    },
  ],
  stepsHeading: "From listing photo to Facebook post",
  steps: [
    {
      title: "Upload a photo you can publish",
      description:
        "A listing photo, an open-house shot, or a just-sold exterior you have permission to use.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. Your brokerage may also have rules about which logo appears. You stay in control of that.",
    },
    {
      title: "Check the caption against the listing",
      description:
        "Confirm the status, the price if you mention one, and the wording your brokerage allows. Fair housing rules still apply.",
    },
    {
      title: "Publish to your Facebook Page",
      description:
        "Connect a Page, or create one, when the caption is accurate.",
    },
  ],
  faqs: [
    {
      question: "What are good Facebook post ideas for realtors?",
      answer:
        "A listing photo, an open-house time, a just-listed or just-sold note, or a local tip that does not depend on a new listing. Use photos you have the right to publish, and keep private seller details out of the caption.",
    },
    {
      question: "Does SnapPost Pro write my MLS description?",
      answer:
        "No. It drafts a Facebook caption from the photo you upload. You still follow your brokerage rules, fair housing rules, and any listing-advertising requirements before you publish.",
    },
    {
      question: "How much does SnapPost Pro cost for a realtor?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Do I need a Page and a logo before I can try a post?",
      answer: PAGE_LATER,
    },
  ],
  closingHeading: "Turn today's listing photo into a post.",
  closingBody:
    "Preview the post before you sign up. 3 free posts, and no card required.",
});

export const cleanersPage = page("cleaners", {
  title: "Social Media for Cleaning Businesses | SnapPost Pro",
  description:
    "Social media for cleaning businesses. Turn an after photo into a branded Facebook post, review the caption, and start with 3 free posts. No card required.",
  h1: "Social media for cleaning businesses",
  eyebrow: "For house cleaners — no Page or logo needed to start",
  intro:
    "A finished kitchen or a cleared move-out is the proof clients ask for. Upload that after photo, add your logo if you have one, and review the caption before it goes on your Facebook Page. You can start without a card.",
  exampleHeading: "Facebook post ideas for house cleaners",
  exampleIntro:
    "Show the work without showing whose home it is. These captions are examples, not reviews from real clients.",
  examples: [
    {
      title: "Kitchen after a deep clean",
      photo:
        "Counters, sink, and floor after the clean. Move mail, photos, and anything with a name out of the frame first.",
      caption:
        "Kitchen reset. Counters clear, sink scrubbed, and the floor done. This is the version of a deep clean we leave behind.",
      hashtags: "#HouseCleaning #DeepClean #CleaningBusiness",
    },
    {
      title: "Move-out clean",
      photo:
        "An empty room after the clean, with no leftover boxes that show an address.",
      caption:
        "Move-out clean finished. Empty rooms, wiped closets, and a kitchen the next person can walk into. Ask about openings if your lease-end date is close.",
      hashtags: "#MoveOutClean #CleaningService #HouseCleaning",
    },
    {
      title: "What a recurring visit includes",
      photo:
        "A bathroom or living area after a maintenance visit. You do not need a before photo.",
      caption:
        "Recurring clean done: baths, floors, and the kitchen surfaces we hit every visit. Same checklist, so the house stays steady between the bigger cleans.",
      hashtags: "#RecurringCleaning #MaidService #LocalCleaner",
    },
  ],
  stepsHeading: "From a finished room to a Facebook post",
  steps: [
    {
      title: "Upload the after photo",
      description:
        "Take it before you leave, once personal items are out of the shot. Permission from the client still applies.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. A new cleaning business can preview posts before the logo file exists.",
    },
    {
      title: "Review the caption",
      description:
        "Name the service you actually did: a deep clean, a move-out, or a recurring visit. Delete anything that identifies the home.",
    },
    {
      title: "Publish to your Facebook Page",
      description:
        "Connect a Page, or create one, when you want new clients to find the post.",
    },
  ],
  faqs: [
    {
      question: "What should a cleaning business post on Facebook?",
      answer:
        "An after photo of a kitchen, bathroom, or empty move-out, a note about openings, or a plain explanation of what a recurring clean includes. Skip identifying details from the home.",
    },
    {
      question: "Can I show the inside of a client's home?",
      answer:
        "Only with permission. Leave out family photos, mail, addresses, and anything that identifies the household. A close photo of the finished counter or floor is usually enough.",
    },
    {
      question: "How much does SnapPost Pro cost for a cleaning business?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Do I need a logo to make the first posts?",
      answer:
        "No. The logo is optional. You can still get a caption and a post preview from the photo, then sign up for 3 free posts with no card.",
    },
  ],
  closingHeading: "Show a room you just finished.",
  closingBody:
    "Make the preview from the after photo, then sign up for 3 free posts. No card required.",
});

export const autoDetailersPage = page("auto-detailers", {
  title: "Facebook Post Ideas for Auto Detailers | SnapPost Pro",
  description:
    "Facebook post ideas for auto detailers, from paint and interior photos. Add your logo, review the caption, and get 3 free posts. No card required.",
  h1: "Facebook post ideas for auto detailers",
  eyebrow: "For auto detailers — no Page or logo needed to start",
  intro:
    "The finish sells the next detail. Upload the photo you took when the car was done, in daylight if you can. SnapPost Pro adds your logo if you have one and drafts a caption you edit before it reaches your Facebook Page.",
  exampleHeading: "Posts you can make before the car goes home",
  exampleIntro:
    "Crop out license plates and paperwork. These captions are examples, not posts from a real detail shop.",
  examples: [
    {
      title: "Exterior in daylight",
      photo:
        "A three-quarter view after the wash, with the paint reflecting the sky. Avoid the plate.",
      caption:
        "Washed, decontaminated, and dried. Daylight shows the finish better than a filter does. This one is ready to hand back.",
      hashtags: "#AutoDetailing #CarDetailing #MobileDetail",
    },
    {
      title: "Interior reset",
      photo:
        "The cabin after vacuuming and wiping, with no mail, garage remotes, or personal items left in frame.",
      caption:
        "Interior reset: mats out, vents cleaned, and the cabin wiped down. A detail is easier to see when the inside matches the paint.",
      hashtags: "#InteriorDetail #CarCare #MobileDetailing",
    },
    {
      title: "A close-up of the panel",
      photo:
        "One panel after correction or wax, close enough that the finish is the subject. Do not claim a service you did not perform when you edit the caption.",
      caption:
        "Close-up of a panel after the finish work. Swirl marks are the kind of thing a phone photo can show, and the kind of thing a proper detail can improve.",
      hashtags: "#Detailing #PaintFinish #AutoDetail",
    },
  ],
  stepsHeading: "From a finished detail to a Facebook post",
  steps: [
    {
      title: "Upload the finished car",
      description:
        "Take the photo before the vehicle leaves. Daylight and a clear background beat a dark garage shot.",
    },
    {
      title: "Add your logo if you have one",
      description:
        "Optional. The caption and preview still work if you do not have a logo file yet.",
    },
    {
      title: "Review the caption",
      description:
        "Name only the services you performed. Remove any plate, face, or address that slipped into the photo.",
    },
    {
      title: "Post to your Facebook Page",
      description:
        "Connect a Page, or create one, when the caption matches the work.",
    },
  ],
  faqs: [
    {
      question: "What are good Facebook post ideas for auto detailers?",
      answer:
        "A finished exterior in daylight, an interior after a reset, a close-up of a panel, or your mobile setup in a driveway. Before-and-after pairs work when both photos are yours and the plate is cropped out.",
    },
    {
      question: "Do I need a studio or a special camera?",
      answer:
        "No. A phone photo in daylight is enough. Take it when the car is done, before it leaves the bay or the driveway.",
    },
    {
      question: "How much does SnapPost Pro cost for a detailer?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Should I leave the license plate in the photo?",
      answer:
        "No. Crop out plates, faces, documents, and garage codes. The finish should be what people see.",
    },
  ],
  closingHeading: "Post the finish before the car goes home.",
  closingBody:
    "Preview the post from the photo you just took, then sign up for 3 free posts. No card required.",
});

export const petGroomersPage = page("pet-groomers", {
  title: "Facebook Post Ideas for Pet Groomers | SnapPost Pro",
  description:
    "Facebook post ideas for pet groomers. Turn a groom photo into a branded post, review the caption, and start with 3 free posts. No card required.",
  h1: "Facebook post ideas for pet groomers",
  eyebrow: "For pet groomers — no Page or logo needed to start",
  intro:
    "A fresh groom is the ad. Upload a photo the owner said you may share, add your logo if you have one, and review the caption SnapPost Pro writes. Publish it to your Facebook Page when you have appointments to fill.",
  exampleHeading: "Posts you can make from today's groom",
  exampleIntro:
    "Only use a pet photo the owner allowed. These captions are examples, not posts from a real grooming shop.",
  examples: [
    {
      title: "Finished groom",
      photo:
        "The pet after the groom, face and coat visible, with no owner, phone number, or address in the frame.",
      caption:
        "Freshly groomed and ready for the ride home. Bath, brush-out, and a tidy face so the coat sits the way it should.",
      hashtags: "#DogGrooming #PetGrooming #FreshGroom",
    },
    {
      title: "A breed you see often",
      photo:
        "One pet, after the haircut that breed usually needs. Say the breed only if you are sure.",
      caption:
        "A tidy outline and a coat that can actually dry. Breed cuts go faster when we see that coat on a regular schedule.",
      hashtags: "#DogGroomer #PetSalon #Grooming",
    },
    {
      title: "Open appointments",
      photo:
        "Your tub, table, or a pet you already have permission to show. The caption carries the schedule.",
      caption:
        "A few groom slots are open this week. If your dog is due for a bath or a full groom, send their size and the coat type and we will match a time.",
      hashtags: "#GroomingAppointments #DogBath #PetCare",
    },
  ],
  stepsHeading: "From the groom table to a Facebook post",
  steps: [
    {
      title: "Upload a photo you can share",
      description:
        "A finished groom the owner approved, or a photo of your table and tub. Leave owner details out.",
    },
    {
      title: "Add your logo if you have one",
      description: "Optional. The post preview does not depend on a logo file.",
    },
    {
      title: "Review the caption",
      description:
        "Check the breed, the services, and that no owner name or phone number slipped in.",
    },
    {
      title: "Publish to your Facebook Page",
      description:
        "Connect a Page, or create one, when you want local pet owners to see the groom.",
    },
  ],
  faqs: [
    {
      question: "What should a pet groomer post on Facebook?",
      answer:
        "A finished groom, a breed you see often, your tub or table, or a plain note about open appointments. A clear photo you have permission to use is enough.",
    },
    {
      question: "Do I need the owner's permission to post their pet?",
      answer:
        "Yes if the owner could recognize the pet. Do not include their name, phone number, or address in the photo or the caption. Your tub, your table, or a pet whose owner said yes are the safe posts.",
    },
    {
      question: "How much does SnapPost Pro cost for a groomer?",
      answer: PRICING_ANSWER,
    },
    {
      question: "Do I need a Facebook Page before I can try a caption?",
      answer: PAGE_LATER,
    },
  ],
  closingHeading: "Post the groom while it still looks fresh.",
  closingBody:
    "Create a free preview from a photo you can share, then sign up for 3 free posts. No card required.",
});

const PAGES_BY_ID = {
  contractors: contractorsPage,
  landscapers: landscapersPage,
  hairdressers: hairdressersPage,
  "food-trucks": foodTrucksPage,
  realtors: realtorsPage,
  cleaners: cleanersPage,
  "auto-detailers": autoDetailersPage,
  "pet-groomers": petGroomersPage,
} satisfies Record<TradeLandingId, TradeLandingPage>;

export const TRADE_LANDING_PAGES: readonly TradeLandingPage[] =
  TRADE_LANDING_NAV.map(item => PAGES_BY_ID[item.id]);

export function tradePreviewHref(previewLanding: string) {
  return `/preview?landing=${encodeURIComponent(previewLanding)}`;
}

export function tradeCanonicalUrl(path: string) {
  return `${SITE_ORIGIN}${path}`;
}

export function normalizeTradePath(pathname: string) {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

export function tradeLandingByPath(pathname: string) {
  const normalized = normalizeTradePath(pathname);
  return TRADE_LANDING_PAGES.find(page => page.path === normalized);
}

export function tradeFaqJsonLd(faqs: readonly TradeFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function insertInHead(html: string, snippet: string) {
  if (html.includes("</head>")) {
    return html.replace("</head>", `${snippet}\n</head>`);
  }
  if (html.includes("</title>")) {
    return html.replace("</title>", `</title>\n${snippet}`);
  }
  return `${html}\n${snippet}`;
}

function upsertTag(html: string, pattern: RegExp, tag: string) {
  if (html.search(pattern) !== -1) return html.replace(pattern, tag);
  return insertInHead(html, tag);
}

export function applyTradeLandingMetadata(template: string, pathname: string) {
  const landing = tradeLandingByPath(pathname);
  if (!landing) return template;

  const canonical = tradeCanonicalUrl(landing.path);
  const json = JSON.stringify(tradeFaqJsonLd(landing.faqs)).replaceAll(
    "<",
    "\\u003c"
  );
  let html = upsertTag(
    template,
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(landing.title)}</title>`
  );
  html = upsertTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(landing.description)}" />`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(landing.title)}" />`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(landing.description)}" />`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`
  );
  html = upsertTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`
  );
  html = upsertTag(
    html,
    /<script\s+type="application\/ld\+json"\s+data-trade-faq="true">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" data-trade-faq="true">${json}</script>`
  );
  return html;
}
