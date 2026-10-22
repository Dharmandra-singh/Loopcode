# ReadNX advertising setup

The UI is ready for ad integration, but ads are intentionally not activated until the **ReadNX-specific** AdSense account is approved and its publisher/slot identifiers are known.

## Before enabling ads
1. In Google AdSense, add and verify `readnx.netlify.app` (or the final custom domain).
2. Complete AdSense site review and policy checks.
3. Copy the exact publisher ID (`ca-pub-...`) and create separate responsive display ad units for the homepage placements.
4. Add the official AdSense loader once in `index.html`, then add ad-unit markup using the exact client and slot IDs supplied by AdSense.
5. Add the exact `ads.txt` line supplied by AdSense at the deployed site's publish root.
6. Test on mobile and desktop; verify ads do not cover navigation or article content.

## Important
- Do not copy publisher IDs or slot IDs from a different website unless the same AdSense account explicitly authorizes this domain.
- Do not create a fake `ads.txt` record or invent a slot ID.
- Google News RSS is used only to discover headlines; each card links to the original publisher. Respect publisher terms and do not republish full article text.
- The current RSS function does not guarantee a specific refresh interval from Google News. The page refreshes its request every five minutes and uses short server/CDN caching.
