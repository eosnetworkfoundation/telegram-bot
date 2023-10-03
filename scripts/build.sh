#!/bin/bash
set -eo pipefail

function ee()
{
    echo "$ $*"
    eval "$@" || :
}

function sanitize()
{
    printf "$*" | sed 's/[^-._a-zA-Z0-9]/-/g' | tr -s '-'
}

echo "Starting build. - ${BASH_SOURCE[0]}"
# environment
NPM_ROOT="$(npm run env | grep '^PWD' | cut -d '=' -f '2')"
pushd "$NPM_ROOT"
ee node --version
ee yarn --version
ee npm --version
export ACTOR="$([[ -n "$GITHUB_ACTOR" ]] && echo "$GITHUB_ACTOR" || echo "$USER@$HOSTNAME")"
NODE_MAJOR_VERSION="$(node --version | tr -d 'v' | cut -d '.' -f '1')"
# package info
PACKAGE_NAME="$(cat package.json | jq -r '.name')"
PACKAGE_VERSION="$(cat package.json | jq -r '.version')"
echo "Found package.json for \"$PACKAGE_NAME\" version \"$PACKAGE_VERSION\"."
# git info
export GIT_BRANCH="$(git branch --show-current)"
if [[ -z "$GIT_BRANCH" ]]; then
    export GIT_BRANCH="$(git branch --contains 'tags/v0.1.0' | tail -n +2 | tail -n 1 | tr -d '[:space:]')" # get branch containing tag
fi
export GIT_COMMIT="$(git rev-parse HEAD)"
export GIT_SHORT_COMMIT="$(git rev-parse --short HEAD)"
export GIT_TAG="$(git --no-pager tag --points-at HEAD)"
SANITIZED_BRANCH="$(sanitize "$GIT_BRANCH")"
SANITIZED_TAG="$(sanitize "$GIT_TAG")"
# verify tag matches package.json version, if it exists
if [[ -n "$GIT_TAG" && "$GIT_TAG" != "v$PACKAGE_VERSION" ]]; then
    printf '\e[1;31mERROR: The git tag does not match the package.json version!\e[0m\n'
    echo "             git tag: $GIT_TAG"
    echo "package.json version: $PACKAGE_VERSION"
    echo 'These must match to build a release. Rejecting build.'
    exit 10
fi
# backup node_modules
UNIX_TIME="$(date +%s)"
if [[ -d node_modules ]]; then
    echo 'Backing up your node_modules folder. It will be restored after the build.'
    ee "mv 'node_modules' 'node_modules.$UNIX_TIME.bak'"
fi
# pack metadata into the package.json
echo 'Adding git metadata to package.json.'
ee "mv package.json package.json.$UNIX_TIME.bak"
cat package.json.$UNIX_TIME.bak | jq \
    --arg branch "$GIT_BRANCH" \
    --arg commit "$GIT_COMMIT" \
    --arg short "$GIT_SHORT_COMMIT" \
    --arg tag "$GIT_TAG" \
    '.git += {
        actor: env.ACTOR,
        branch: (if $branch == "" then null else $branch end),
        commit: $commit,
        short_commit: $short,
        tag: (if $tag == "" then null else $tag end)
    }' > package.json
# install dependencies, but not dev dependencies
echo 'Installing production dependencies...'
ee 'yarn --prod --frozen-lockfile --non-interactive'
echo 'Done installing production dependencies.'
# pack a dist.zip for AWS
if [[ -n "$SANITIZED_TAG" ]]; then
    ZIP_NAME="$PACKAGE_NAME-$SANITIZED_TAG-node-$NODE_MAJOR_VERSION.dist.zip"
else
    ZIP_NAME="$PACKAGE_NAME-$SANITIZED_BRANCH-$GIT_SHORT_COMMIT-node-$NODE_MAJOR_VERSION.dist.zip"
fi
echo "Packing \"$ZIP_NAME\" for AWS..."
FILES="$(cat package.json | jq -r '.files[]' | tr '\n' ' ')"
ee "zip -r '$ZIP_NAME' ${FILES}LICENSE node_modules package.json README.md"
echo "Done packing \"$ZIP_NAME\" for AWS."
# put package.json back
ee "mv package.json.$UNIX_TIME.bak package.json"
# restore original node_modules, if it existed
if [[ -d "node_modules.$UNIX_TIME.bak" ]]; then
    echo 'Restoring your node_modules folder.'
    ee 'rm -rf node_modules'
    ee "mv 'node_modules.$UNIX_TIME.bak' 'node_modules'"
fi
printf "\e[1;32mOUTPUT:\e[0;32m $(pwd)/$ZIP_NAME\e[0m\n"
echo 'This zip folder can be uploaded directly to AWS lambda.'
popd
echo "Done. - ${BASH_SOURCE[0]}"
