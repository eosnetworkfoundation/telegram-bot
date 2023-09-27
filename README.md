# Telegram Bot
"[Serverless](https://www.serverless.com)" JavaScript project to deliver instant message (IM) notifications via Telegram using an Amazon Web Services (AWS) [Lambda](https://aws.amazon.com/lambda).

### Index
1. [Development](#development)
    1. [Prerequisites](#prerequisites)
    1. [Initialization](#initialization)
    1. [Lint](#lint)
    1. [Test](#test)
1. [Inputs](#inputs)

## Development
Start here to build this project or to contribute to this repo.

### Prerequisites
You will need the following tools:
- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [nodeJS](https://www.w3schools.com/nodejs/nodejs_intro.asp)
    Install `node` using `nvm`. In the root of this repo:
    ```bash
    nvm install
    ```
    This will automagically install and use the correct version of `node` for this project, as defined in the [`.nvmrc`](./.nvmrc) file.
- [yarn](https://yarnpkg.com) version 1
    The easiest way to install this is using `npm`, which is installed with `node` by `nvm`.
    ```bash
    npm install --global yarn
    ```
These tools are all you need to get started!

### Initialization
Once you have the [prerequisites](#prerequisites) installed, you can get going by making sure `nvm` is using the correct version of nodeJS...
```bash
nvm install
```
...and then downloading all project dependencies.
```bash
yarn
```
Easy.

### Lint
This project uses [eslint](https://eslint.org) with customizations on top of the [airbnb-base](https://www.npmjs.com/package/eslint-config-airbnb-base) config to perform static code analysis.
```bash
yarn lint
```
The purpose of linting is to catch bugs early, not to create unnecessary friction, so many rules which will not realistically catch bugs are disabled.

### Test
This project uses the [jest](https://jestjs.io) test framework.
```bash
yarn test
```
The goal is full test coverage, not because we chased a number, but because we exhaustively tested all intended functionality.

## Inputs
This lambda receives two primary inputs, SNS event payloads delivered by AWS and user-defined environment variables to configure the script.

---
**_Legal Notice_**  
Some content in this repo was generated in collaboration with one or more machine learning algorithms or weak artificial intelligence (AI). This notice is required in some countries.
