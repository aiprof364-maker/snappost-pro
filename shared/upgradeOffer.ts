import { PLANS } from "./const";

/** Price and trial line shared by the upgrade panel and the free-posts emails. */
export function upgradeOfferLine(trialEligible: boolean): string {
  const prices = `Starter is ${PLANS.starter.priceLabel} and Pro is ${PLANS.pro.priceLabel}.`;
  return trialEligible
    ? `${prices} Includes one 7-day trial for first-time customers.`
    : prices;
}
