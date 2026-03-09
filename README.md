# IMPORTANT NOTICE
From the 15th of December 2025 Notifian will NOT BE AVAILABLE TO USERS IN THE USA. 

As much as I would like the ~25% of my users located in the USA to be able to continue using the app, a new law being introduced in several US states has forced this decision. 

The law requires all Android apps to verify the age of their users to determine whether they should be able to access an app or not. I belive this kind of data collection is unwarranted for Notifian and an unecessary violation of my users' privacy. Rather than compromising my values on privacy and data collection I've decided to make my app unavailable to users in the USA through the play store. The first law that requires this comes into effect in 2026, but I've decided to make this change before then to ensure compliance. For more information about this see: https://support.google.com/googleplay/android-developer/answer/16569691?hl=en

I apologise to all the users of Notifian located in the USA, I wish I didn't have to make this decision. If these laws are reversed in the future I'll definitely make Notifian available in the USA again. For further enquiries, please contact me at: notifian.team@gmail.com

## UPDATE 10/03/2026

From the 17/03/2026, the Brazilian government will also be mandating that apps ingest age range data from app stores. For the reasons listed in the section above Notifian will no longer be available to users in Brazil from the 10/3/2026. I apologise to all users in Brazil that would like to use the app, if this law is removed in the future I'll gladly make Notifian available in Brazil again.

# Notifian
A React Native android app that automatically schedules android system reminders from your Obsidian notes (available on the [Google Play Store](https://play.google.com/store/apps/details?id=com.notifian)). It does this by scanning a folder containing one or more vaults, identifying reminder information and setting system notifications from that.

This project was forked from a private project I was working on. I had intended to commercialise that project, so I've copied the code from the fork to this new repo, to avoid including any of my pre-fork work in the commit history. 

Play Store builds from v1.20 onwards will be generated from the code on the `master` branch once enough stable improvements have been made to justify it. I can also create APKs and publish them as "releases" on Github, I don't plan on doing this at the moment but if enough users are interested I'll look into it.

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
