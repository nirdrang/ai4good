# A self-hosted GitHub Actions runner, in Linux, for this repository.
#
# WHY THIS EXISTS AT ALL: the required `verify` check executes in about ten seconds and was
# spending eleven to fifteen minutes queueing for a GitHub-hosted machine — twice dying to the
# job's own timeout before running a single step. A runner here starts in seconds.
#
# WHY LINUX AND NOT THE WINDOWS HOST: the check's value is that it judges the code on Linux.
# This project has already shipped a green Windows run on a head whose Linux CI failed, and that
# is the evidence that ended interim mode. Running the check on the developer's own operating
# system would throw that away while still looking like a check.
#
# The base tracks what `ubuntu-latest` resolves to, so the check keeps judging the same platform
# it judged before this change.
FROM ubuntu:24.04

# Pinned by version AND by hash. The hash below is published in the release notes for this tag
# and matches the release asset's own digest.
ARG RUNNER_VERSION=2.336.0
ARG RUNNER_SHA256=04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d

ENV DEBIAN_FRONTEND=noninteractive

# EVERY PACKAGE HERE EXISTS BECAUSE A STEP IN ci.yml NEEDS IT. A GitHub-hosted image arrives with
# hundreds of tools preinstalled; a runner tarball arrives with none. That gap is the single most
# likely thing to break a self-hosted migration, so the dependency is explicit and traced:
#
#   git                         actions/checkout
#   curl, unzip                 oven-sh/setup-bun downloads and unpacks bun
#   gh                          the ownership guard and the closure guard both call `gh api`
#   ca-certificates, tar, gzip  fetching the runner and anything else over TLS
#   sudo                        actions commonly assume an unprivileged user can escalate
#
# jq is deliberately absent: the guards use `gh api --jq`, which is gh's own built-in.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git tar gzip unzip sudo \
 && install -m 0755 -d /usr/share/keyrings \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# The runner refuses to execute as root unless overridden, and overriding it is the wrong
# instinct: a job that can write anywhere in the container is a job that can rewrite its own
# runner. It gets an unprivileged user instead.
RUN useradd -m -s /bin/bash runner \
 && usermod -aG sudo runner \
 && echo "runner ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/runner \
 && chmod 0440 /etc/sudoers.d/runner

WORKDIR /actions-runner

# installdependencies.sh pulls the .NET runtime libraries the runner needs (libicu in
# particular). Running it here rather than setting DOTNET_SYSTEM_GLOBALIZATION_INVARIANT keeps
# string comparison behaving the way it does on a hosted runner.
RUN curl -fsSL -o runner.tar.gz \
      "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
 && echo "${RUNNER_SHA256}  runner.tar.gz" | sha256sum -c - \
 && tar xzf runner.tar.gz \
 && rm runner.tar.gz \
 && ./bin/installdependencies.sh \
 && chown -R runner:runner /actions-runner

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh

# No Docker socket is mounted and none is needed: nothing in ci.yml builds or runs a container.
# Mounting one would hand every workflow root on the host, which is the usual way a self-hosted
# runner becomes the weakest part of a system.
USER runner
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
