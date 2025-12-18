# TINKER

A Crafting Chatbot for KoL

# Development

First turn your TypeScript files into something KoLmafia can understand by running

```bash
yarn run build
```

Then you can automatically create symlinks to your built files by running

```bash
yarn run install-mafia
```

When you're developing you can have your files automatically rebuild by keeping

```bash
yarn run watch
```

running in the background. If you've already built symlinks, your up-to-date script can be run instantly by entering `TINKER` into the KoLmafia CLI. However, as a chatbot, you will recieve best results by going into Preferences -> Automation and setting `scripts/TINKER/TINKER.js` as your chatbot script.
