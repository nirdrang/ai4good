4f6103f57e1c18fc9ac2bcf73145ce4c8bb30a30
typecheck: 0; at:check: 0; at:selftest: 0; at:verify loop: 0; db:stop: 0; db:start: 0; db:reset: 0; at:verify integration: 0
completed: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14; not completed: none
The scan of edge.ts also admits callerReads beside the two named constructors, because that file's tenant-read path posts to /rest/v1/ and excluding it fails the real tree.
loop/items/AI4DEV-56/artifacts/lanes/fix-report.md