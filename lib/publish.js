/*
 
  Main module for atom:publish
    
*/

const Fs = require('fs');
const Path = require('path');
const _ = require('underscore');

const GitLog = require('git-log-utils');
const GitStatus = require('git-status-utils');

const {TextEditor} = require('atom');
const SubAtom = require('sub-atom');

const PublishView = require('./publish-view');
const PublishProgressView = require('./publish-progress-view');
const CommandExecutor = require('./command-executor');

const ChangeLog = require('./change-log');


module.exports = {
  publishView: null,
  timelinePanel: null,
  subscriptions: null,

  activate(state) {
    this.publishView = new PublishView();
    this.publishProgressView = new PublishProgressView();
    this.executor = new CommandExecutor({ 
      onOutput: data => this._onCommandOutput(data),
      onError: data => this._onCommandError(data),
      onFail: code => this._onPublishFail(code)
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new SubAtom();
    
    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:patch': () => this.patch()}));
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:minor': () => this.minor()}));
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:major': () => this.major()}));
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:version': () => this.version()}));
    
    // @subscriptions.add @publishView, "save", (evt, attributes) => @_onPublish(attributes)
    // @subscriptions.add @publishProgressView, "cancel", @_onCancel
    this.publishView.on("save", (evt, attributes) => this._onPublish(attributes));
    this.publishProgressView.on("cancel", this._onCancel);
  },
    

  deactivate() {
    this.subscriptions.dispose();
    return this.publishView.destroy();
  },


  serialize() {
    return {publishViewState: this.publishView.serialize()};
  },
    
    
  patch() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(2, currentVersion);
    });
  },


  minor() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(1, currentVersion);
    });
  },
    
  
  major() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(0, currentVersion);
    });
  },
    

  version(versionMethod=null){
    const packageFile = this.findPackageJson();
    if (packageFile == null) {
      alert("Publish: unable to find a package.json file");
      return;
    }
      
    this.gitStatus = GitStatus.getStatus(Path.dirname(packageFile));
    if ((this.gitStatus.stagedChanges.length > 0) || (this.gitStatus.unstagedChanges.length > 0)) {
      alert(`Publish: Cowardly refusing to publish.  Uncommitted changes exist on current branch (${this.gitStatus.branch})`);
      return; 
    }
      
    this.npmPackage = JSON.parse(Fs.readFileSync(packageFile));
    let currentVersion = this.npmPackage.version;
    const newVersion = versionMethod(currentVersion);
    
    const {commits, lastVersionTag} = this.getCommitsSinceLastTag(packageFile);
    if (lastVersionTag !== currentVersion) {
      console.log(`Found last version in git log ${lastVersionTag} differs from package.json version ${currentVersion}.  Using version from git log.`);
      currentVersion = lastVersionTag;
    }
      
    this.publishView.showFor(currentVersion, newVersion, commits, this.gitStatus, this.npmPackage);
  },
    
  
  getCommitsSinceLastTag(packageJsonFile) {
    const commits = GitLog.getCommitHistory(Path.dirname(packageJsonFile));
    const commitsOut = [];
    let lastVersionTag = null;
    for (let commit of commits) {
      const matches = commit.message.match(/^(Prepare )?(v?\d+\.\d+\.\d+)( release)?$/i);
      if (matches != null) {
        lastVersionTag =  matches[2];
        break;
      }
      commitsOut.push(commit);
    } 
    
    return {commits: commitsOut, lastVersionTag: lastVersionTag};
  },
    
    
  findPackageJson() {
    let packageJsonFile;
    const projectDir = this._getProjectDir();
    if (projectDir == null) { return null; }
      
    const testPath = Path.join(projectDir.getPath(), 'package.json');
    if (Fs.existsSync(testPath)) {
      packageJsonFile = testPath;
    }
      
    if (packageJsonFile == null) {
      alert(`Publish: Unable to locate package.json in project directory ${projectDir}`);
      return;
    }
  
    return packageJsonFile;
  },
    
    
  _getProjectDir() {
    const projectDir = atom.project.getDirectories()[0];
    if (projectDir == null) {
      alert('Publish: Open the project directory of the package you wish to publish and try again');
      return null;
    }
    return projectDir;
  },
    

  
  // partIndex: 0=major 1=minor 2=patch ...
  _bumpVersionPart(partIndex, currentVersion) {
    const parts = currentVersion.split('.');
    // zero out parts after the desired part
    if (partIndex < parts.length) {
      for (let i = partIndex + 1; i < parts.length; i++){
        parts[i] = "0";
      }
    }
    parts[partIndex] = Number.parseInt(parts[partIndex]) + 1;
    return parts.join('.');
  },
    
    
  _onPublish(attributes) {
    this.publishProgressView.reset();
    this.publishProgressView.show();
    this.publishProgressView.messageUser(`<h5>Publishing ${attributes.newVersion}...</h5>`);
    
    this._updateChangeLog(attributes);
    
    const subcommands = this._isAtomPackage() ?
      this._getApmCommands(attributes.newVersion) 
    : 
      this._getNpmCommands(attributes.newVersion);
      
    const commands = [
      "git add CHANGELOG.md",
      "git commit -m 'updated changelog via atom:publish'",
      `git pull origin ${this.gitStatus.branch}`
    ].concat(subcommands, [(() => this._onPublishSuccess(attributes.newVersion))]);
    
    // cancel any outstanding commands
    if (this.executor != null) {
      this.executor.cancelCommands();
    }
    
    this.executor.options.cwd = this._getProjectDir().getPath();
    console.log("publish: going to execute:", commands);
    return this.executor.executeCommands(commands);
  },
    
    
  _updateChangeLog(attributes) {
    const projectDir = this._getProjectDir();
    if (!projectDir) { return null; }
    
    const changeLogFile = Path.join(projectDir.getPath(), 'CHANGELOG.md');
    this.publishProgressView.messageUser(`Updating ${changeLogFile}...`, {break: false}); 
        
    const repoUrl = (this.npmPackage.repository != null ? this.npmPackage.repository.url : undefined) || this.npmPackage.repository; 
    const changeLog = new ChangeLog(changeLogFile, repoUrl);
    changeLog.set(attributes.newVersion, attributes.description, attributes.commits);
    changeLog.write();
    return this.publishProgressView.messageUser(".  Done.<br>");
  },
    
    
  _isAtomPackage() {
    return this.npmPackage && this.npmPackage.engines && this.npmPackage.engines.atom ? this.npmPackage.engines.atom : null
  },
    
    
  _getApmCommands(newVersion) {
    return [
      `apm --no-color publish ${newVersion}`,
      `git push origin ${this.gitStatus.branch}`,
      "git push origin --tags"      
    ];
  },
    
  _getNpmCommands(newVersion) {
    return [
      `npm version ${newVersion}`,
      `git push origin ${this.gitStatus.branch}`,
      "git push origin --tags",
      "npm publish"
    ];
  },


  _onCancel() {
    return (this.executor != null ? this.executor.cancelCommands() : undefined);
  },
    
    
  _onCommandOutput(data) {
    return this.publishProgressView.messageUser(data.toString().replace(/\n/g, "<br>"));
  },
    

  _onCommandError(data) {
    return this.publishProgressView.messageUser(`<span class='text-error'>${data.toString()}</span>`);
  },
    

  _onPublishSuccess(newVersion) {
    this.publishProgressView.messageUser(`<br><br>Done.  You published ${newVersion} and it was good.`);
    return this.publishProgressView.done();
  },
      
  
  _onPublishFail(code) {
    this.publishProgressView.messageUser(`Failed to publish.  Last command exited with code: ${code}`);
    this.publishProgressView.done();
    return false; // don't continue executing commands
  }   
};
    
      
  
  
    
    
  
