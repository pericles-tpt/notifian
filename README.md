# Notifian
A React Native android app that automatically schedules android system reminders from your Obsidian notes. It does this by scanning a folder containing one or more vaults, identifying reminder information and setting system notifications from that.

This project was forked from a private project I was working on. I had intended to commercialise that project, so I've copied the code from the fork to this new repo, to avoid including any of my pre-fork work in the commit history.

## Why open source?
I've decided to open source the app as I don't have a lot of time to add new features to it. I'm hoping that some members of the Obsidian community will be able to improve the code and add features at a faster rate than me. 

My focus will be on fixing any bugs/issues and reviewing PRs, but I may occasionally get some time to implement new features.

## Contributing
I don't have much experience maintaining open source projects so there's no "CONTRIBUTING" document yet. I'll probably create and update one as I review PR's and get a better idea of what the guidelines should be. The only guidelines at the moment are:
- Ask before you open a PR, to make sure no one else is working on the same feature as you.
- Don't submit any PRs that modify/delete data in user's vaults. The app is currently "read only" when it comes to users' Obsidian data. If you have a good argument for allowing modifications feel free to open an issue to discuss it.

## Structure
A high level overview of the code structure:
- components: contains individual UI components, cards, buttons, etc
- db: contains all the code for interacting with the local SQlite DB (containing a single table for storing information about every note)
- db/json.ts: contains logic for updating the user's configured settings in a local JSON file
- pages: components for each "page" in the UI
- utilities: general utilities
- utilities/app: more utilities, but their logic is more specific to THIS app

If you're wondering where you should add some code, use the descriptions above as a guide. If you're still unsure feel free to open a "Discussion" to clarify!

The most important file is `utilities/app/Walk.ts`, this contains the logic for scanning folders and identifying reminders. Most of the code for translating a note to a reminder is in this file.

## Releases
The project currently doesn't have any. But I might add apk releases in the future. I can deploy updates to the Play Store, so for the moment I'll just manually tag a bunch of commits for each Play Store update.
