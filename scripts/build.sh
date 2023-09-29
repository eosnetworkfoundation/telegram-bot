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
NPM_ROOT="$(npm run env | grep '^PWD' | cut -d '=' -f '2')"
pushd "$NPM_ROOT"
# package info
PACKAGE_NAME="$(cat package.json | jq -r '.name')"
PACKAGE_VERSION="$(cat package.json | jq -r '.version')"
echo "Found package.json for \"$PACKAGE_NAME\" version \"$PACKAGE_VERSION\"."
# git info
GIT_BRANCH="$(git branch --show-current)"
GIT_SHORT_COMMIT="$(git rev-parse --short HEAD)"
GIT_TAG="$(git --no-pager tag --points-at HEAD)"
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
unset UNIX_TIME
if [[ -d node_modules ]]; then
    echo 'Backing up your node_modules folder. It will be restored after the build.'
    UNIX_TIME="$(date +%s)"
    ee "mv 'node_modules' 'node_modules.$UNIX_TIME.bak'"
fi
# install dependencies, but not dev dependencies
echo 'Installing production dependencies...'
ee 'yarn --prod --frozen-lockfile --non-interactive'
echo 'Done installing production dependencies.'
# pack a dist.zip for AWS
if [[ -n "$SANITIZED_TAG" ]]; then
    ZIP_NAME="$PACKAGE_NAME-$SANITIZED_TAG.dist.zip"
else
    ZIP_NAME="$PACKAGE_NAME-$SANITIZED_BRANCH-$GIT_SHORT_COMMIT.dist.zip"
fi
echo "Packing \"$ZIP_NAME\" for AWS..."
FILES="$(cat package.json | jq -r '.files[]' | tr '\n' ' ')"
ee "zip -r '$ZIP_NAME' ${FILES}LICENSE node_modules package.json README.md"
echo "Done packing \"$ZIP_NAME\" for AWS."
# restore original node_modules, if it existed
if [[ -n "$UNIX_TIME" ]]; then
    echo 'Restoring your node_modules folder.'
    ee 'rm -rf node_modules'
    ee "mv 'node_modules.$UNIX_TIME.bak' 'node_modules'"
fi
printf "\e[1;32mOUTPUT:\e[0;32m $(pwd)/$ZIP_NAME\e[0m\n"
echo 'This zip folder can be uploaded directly to AWS lambda.'
popd
echo "Done. - ${BASH_SOURCE[0]}"
