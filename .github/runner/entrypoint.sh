#!/usr/bin/env bash
# Register this container as a self-hosted runner for one repository, then run it.
#
# The registration token is minted on the HOST and passed in at `docker run` time. It is never
# baked into the image and never written into the repository. It expires in about an hour, which
# is exactly why the runner's state lives in a named volume: a restart tomorrow reuses the
# existing registration instead of needing a token nobody is around to mint.
set -euo pipefail

: "${RUNNER_REPO_URL:?RUNNER_REPO_URL is required, e.g. https://github.com/owner/repo}"

cd /actions-runner

if [ -f .runner ]; then
  echo "runner state found in the volume - reusing the existing registration"
else
  : "${RUNNER_TOKEN:?RUNNER_TOKEN is required for first registration; mint one on the host}"
  echo "no runner state - registering"
  # --replace lets a re-registration under the same name take over from a stale entry instead of
  # failing, which is what happens after the volume is deleted and rebuilt.
  ./config.sh --unattended --replace \
    --url "$RUNNER_REPO_URL" \
    --token "$RUNNER_TOKEN" \
    --name "${RUNNER_NAME:-ai4good-docker}" \
    --labels "${RUNNER_LABELS:-ai4good-linux}" \
    --work _work
fi

# run.sh handles SIGTERM by finishing the job in flight before exiting, so `docker stop` will
# never cut a check off mid-run and leave a pull request holding an unexplained failure.
exec ./run.sh
