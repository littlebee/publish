# publish package for Atom

Publish is a package for [Atom](https://atom.io/) to publish your project to NPM or APM and update your change log.  

![Gratuitous animated screenshot](https://raw.githubusercontent.com/littlebee/publish/master/resources/publishCap.gif)

You know those seven steps you have to go through every time you publish to NPM:
- update the change log to let your users know what changed
- git commit -am 'updated changelog'
- git pull origin master
- npm version <new version>
- git push origin master
- git push origin --tags
- npm publish


Wouldn't it be swell if there were a way to reduce this work?   Well, there is now.

Publish package for Atom