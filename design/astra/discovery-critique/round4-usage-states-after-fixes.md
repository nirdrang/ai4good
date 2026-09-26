## 1. My earlier problems

1. **Phone money far from Send — Fixed.** On phone-01/-08/-09 the line directly above Send now reads "$10.00 fuel left" / "$2.00 fuel left · getting low" / "$0.499 fuel left · nearly used … Up to $0.25 is set aside while it runs."
2. **07 double-charge fear — Partly fixed.** The yellow box now says the $0.25 "is set aside," "The fuel shown already excludes it," "This is not an extra charge" — but I still can't see which reply the hold belongs to; no message carries a pending marker.
3. **"Buy fuel" terms — Fixed.** Every usage card now shows "Minimum purchase $50. Fuel pays for replies. It does not add free replies."
4. **"Within allowance" next to $0 fuel — Fixed.** In 04/05 the fuel bar and "Within allowance" are gone; the card reads "This project has no fuel for Discovery replies" beside $0.00.
5. **Gauge explanation — Fixed.** 08 reads "80% used · Getting low · replies still work" and 09 reads "95.01% used · Nearly used · replies still work."
6. **"beside this chat" on phone — Fixed.** 04/05 now say "add project fuel in the Discovery usage card," which matches where the card really is.
7. **Beta wording — Fixed.** 01/04/10 say "Beta free replies count only while today's free replies last" and 03/05 say "Beta free replies don't reset."
8. **"allocated" wording — Fixed.** It now reads "This project has no fuel for Discovery replies."
9. **Label mismatches — Partly fixed.** The free states now add "1 reply = 1 turn," but in the paid states "Actual usage in USD" still sits above rows like "Beta free turns 42 of 50 left."

## 2. Situation-by-situation

| # | Situation | Rating | Desktop vs phone |
|---|---|---|---|
| 01 | daily limit, fuel | Clear | None — "Next reply: paid · $10.00 fuel left · up to $0.25 set aside" is right at Send on both |
| 02 | after a paid reply | Clear | None — chat shows $0.04 + $0.006 = $0.046 and Send/card show $9.954 on both |
| 03 | beta limit, fuel | Clear | None — "All 50 beta free replies are used … don't reset"; next paid from $10 |
| 04 | daily limit, no fuel | Clear | None — blocked, draft kept, banner at Send says wait for reset or add fuel |
| 05 | beta limit, no fuel | Clear (one wrinkle) | None — but the "Next reply" block's "Daily turns reset at 03:00 AM" can't restore free replies here (new problem 2) |
| 06 | no fuel, free replies left | Clear | None — "Next reply: free · 1 turn," "Free replies never use your money," $0 fuel |
| 07 | paid usage pending | Clear | None — hold is explained as already excluded, "not an extra charge"; which reply it belongs to still isn't marked |
| 08 | gauge 80% | Clear | None — "$2.00 fuel left · getting low" at Send matches the bar label below |
| 09 | gauge 95.01% | Clear | None — "$0.499 fuel left · nearly used" at Send; "replies still work" tells me red doesn't block |
| 10 | gauge 100% | Clear | None — "100% used · Fully used," blocked with draft kept, banner at Send |
| 11 | reply failed | Clear | None — "No turn or fuel was charged," text kept, "Retry reply," next reply free |

No rating differs between desktop and phone any more; the only difference is layout (phone stacks my live brief and the usage card below the chat), but the Send line now carries the same money facts on both.

## 3. New problems

1. **The beta and daily counters don't add up — Minor.** Screens: 01, 02, 04, 07, 08, 09, 10 (desktop and phone). I see "Daily free turns 0 of 10 left" beside "Beta free turns 42 of 50 left." If today's 10 free replies were used, and a free reply uses one beta turn too (the card itself says beta replies count only while today's free replies last), I'd expect beta to be 40 of 50 or lower. These two counters decide when I stop being free, so I stop trusting the math. Fix: make the fixtures agree (e.g., 40 of 50 when today's 10 are used), or state in one line that they can move apart.
2. **05's reset line points down a route that doesn't exist — Minor.** Screens: desktop-05, phone-05. Under "Next reply: Not available now" it says "Daily turns reset at 03:00 AM in your time zone," while the banner says add fuel; with all 50 beta replies used and "Beta free replies don't reset," 03:00 will not give me a free reply. I might wait overnight instead of adding fuel. Fix: in this state, replace it with "Free replies can't return once beta turns are used — add fuel to continue," or hide the reset line.
3. **The 80% bar still doesn't look yellow to me — Minor (and I'm not sure whether it's the bar or the screenshot).** Screens: desktop-08, phone-08. The 80% bar reads dark to me; the "Getting low · replies still work" label is what reassures me, not the color. Fix: make the 80% state clearly yellow so the warning works even without reading.

Verdict: ready
