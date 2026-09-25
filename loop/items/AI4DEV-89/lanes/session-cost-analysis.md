# Session cost analysis

Source file: C:\Users\nirdr\.claude\projects\C--Users-nirdr-Downloads-ai4good\bd9793c7-076a-4b9e-aa67-2d043721a824.jsonl

## 1. Session span
```
First timestamp: 2026-09-08T14:23:41.0160000Z
Last timestamp:  2026-09-09T13:01:45.7990000Z
Elapsed: 22h 38m (22.63 hours)
```

## 2. Turns
```
Assistant records: 590
User records: 323
```

## 3. Token totals
```
input_tokens: 2680
output_tokens: 838700
cache_creation_input_tokens: 2862330
cache_read_input_tokens: 210228368
GRAND TOTAL: 213932078
cache_read as % of grand total: 98.27%
```

## 4. Tool call counts
```
136	PowerShell
34	Read
30	Grep
19	Agent
8	Write
7	mcp__linear__save_issue
7	mcp__linear__save_comment
5	ToolSearch
5	SendMessage
5	mcp__linear__list_issues
2	Glob
2	Skill
1	ExitWorktree
1	EnterWorktree
1	ListAgents
1	mcp__linear__get_issue
```

## 5. Biggest tool_result records
```
Total tool_result size: 1.39 MB
Top 20 share of total: 30.38%
```
1. 32.9 KB - {"parentUuid":"850a87ed-2058-4d40-9379-f3909ddfdb9e","isSidechain":false,"promptId":"11340a3c-cf4f-4
2. 31 KB - {"parentUuid":"5733e560-dbab-4425-949c-4ecc24f8c282","isSidechain":false,"promptId":"3d5ba99c-ccd7-4
3. 30 KB - {"parentUuid":"8bcad342-37a0-47fe-bbb3-901bef721efd","isSidechain":false,"promptId":"d1082df5-c328-4
4. 27.2 KB - {"parentUuid":"d5812f9a-ec0f-4385-94ac-88f8aa0ba89e","isSidechain":false,"promptId":"11340a3c-cf4f-4
5. 25.4 KB - {"parentUuid":"c0db9175-294c-4d34-bcc6-e9fb18b53696","isSidechain":false,"promptId":"11340a3c-cf4f-4
6. 25.2 KB - {"parentUuid":"c4f01b1c-a008-495f-af21-2a0dde47dd52","isSidechain":false,"promptId":"11340a3c-cf4f-4
7. 23.9 KB - {"parentUuid":"9527f769-a8e2-4de1-baf7-49658b0b2cb0","isSidechain":false,"promptId":"11340a3c-cf4f-4
8. 20.9 KB - {"parentUuid":"362f3701-27e1-4b2f-89e0-effab0d432f0","isSidechain":false,"promptId":"345dc427-8e38-4
9. 20.8 KB - {"parentUuid":"4795a943-bb2b-4f1c-aba8-ebdde87a8483","isSidechain":false,"promptId":"7c493ae0-bc8d-4
10. 20.6 KB - {"parentUuid":"fc42e857-a411-4af3-a2a8-3313e44281bc","isSidechain":false,"promptId":"11340a3c-cf4f-4
11. 20.1 KB - {"parentUuid":"da8217fb-39ce-490e-bac7-243876c05da0","isSidechain":false,"promptId":"ef381558-8361-4
12. 19.7 KB - {"parentUuid":"997ba2b8-d2ff-4f6a-be87-641223590c53","isSidechain":false,"promptId":"7c493ae0-bc8d-4
13. 17.8 KB - {"parentUuid":"abf7954a-7639-4cb1-9742-766d0774e412","isSidechain":false,"promptId":"8300185d-8556-4
14. 17.8 KB - {"parentUuid":"48956f9d-8912-4e70-af1b-95dee1c49a55","isSidechain":false,"promptId":"4e61445c-1893-4
15. 17.4 KB - {"parentUuid":"88553319-2a90-49a6-afcf-b10b26ac4f2b","isSidechain":false,"promptId":"11340a3c-cf4f-4
16. 16.7 KB - {"parentUuid":"7372e2c8-8cf5-4a73-9964-5f0a4d4d4476","isSidechain":false,"promptId":"82e52374-fd19-4
17. 16.5 KB - {"parentUuid":"fdc8b78a-41be-45e0-b12f-efe3d5d5d262","isSidechain":false,"promptId":"d1082df5-c328-4
18. 16.3 KB - {"parentUuid":"bbab4588-21db-4a88-9b9f-dd7de954a44d","isSidechain":false,"promptId":"6d94d1a2-914f-4
19. 16.1 KB - {"parentUuid":"e00e0fb6-526b-406e-aaec-61382c4dee7b","isSidechain":false,"promptId":"4e61445c-1893-4
20. 15.3 KB - {"parentUuid":"3a289a48-f1c3-41c4-ac7d-d0b5378c0609","isSidechain":false,"promptId":"6d94d1a2-914f-4

## 6. Time distribution
```
Total elapsed: 22h 38m (81485 seconds)
Sum of gaps over 60s: 76510.1 seconds (1275.2 minutes)
Count of gaps over 60s: 49
```

## 7. Output size by tool (approximate)
Approximation: each tool_result line's size is attributed to the tool_use name(s) in the immediately preceding assistant record. When an assistant record made multiple tool calls, the following user record's tool_result content actually holds one result per call, but this script conservatively splits the line size evenly across the assistant record's tool names rather than attempting to match individual tool_result blocks to individual tool_use ids.
```
0.465 MB	PowerShell
0.347 MB	Read
0.162 MB	Grep
0.1 MB	Agent
0.069 MB	Write
0.023 MB	mcp__linear__save_comment
0.006 MB	mcp__linear__list_issues
0.006 MB	ListAgents
0.005 MB	SendMessage
0.004 MB	ToolSearch
0.004 MB	mcp__linear__save_issue
0.002 MB	mcp__linear__get_issue
0.001 MB	Skill
0.001 MB	EnterWorktree
0.001 MB	ExitWorktree
```
