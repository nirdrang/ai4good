IDENTITY CHECK — audit gate, seat two (flash)
Session ID: ses_017493d2dffeILILGKyhyG5u0D
Pin required: opencode-go/deepseek-v4-flash · agent reviewer-flash

Assistant messages checked: 19
Mismatches: 0

Every assistant message in the session carries providerID=opencode-go, modelID=deepseek-v4-flash,
agent=reviewer-flash. Verified by parsing `opencode export ses_017493d2dffeILILGKyhyG5u0D`
(run from the tree root, no --dir flag — the export subcommand does not accept one) and comparing
each message's info.providerID + "/" + info.modelID and info.agent against the pin.
