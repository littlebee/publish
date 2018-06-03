'use babel'

/*
  Main module for atom:publish
*/

import Fs from 'fs'
import Path from 'path'

import GitLog from 'git-log-utils'
import GitStatus from 'git-status-utils'

import {CompositeDisposable} from 'event-kit'

import DialogView from './dialog-view'
import PublishView from './publish-view'
import PublishProgressView from './publish-progress-view'
import CommandExecutor from './command-executor'
import ChangeLog from './change-log'


export default {
  // these are rendered into the DOM as needed and removed
  publishView: null,
  publishProgressView: null,
  subscriptions: null,

  activate(state) {
    this.executor = new CommandExecutor({
      onOutput: data => this._onCommandOutput(data),
      onError: data => this._onCommandError(data),
      onFail: code => this._onPublishFail(code),
      // TODO : remove me after testing
      dryRun: true,
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:patch': () => this.patch()}))
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:minor': () => this.minor()}))
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:major': () => this.major()}))
    this.subscriptions.add(atom.commands.add('atom-workspace', {'publish:version': () => this.version()}))

  },

  deactivate() {
    this.subscriptions.dispose()
  },

  serialize() {
    // return {publishViewState: this.publishView.serialize()}
    return {}
  },

  patch() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(2, currentVersion)
    })
  },

  minor() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(1, currentVersion)
    })
  },

  major() {
    return this.version(currentVersion => {
      return this._bumpVersionPart(0, currentVersion)
    })
  },

  version(versionMethod = null) {
    const packageFile = this.findPackageJson()
    if (packageFile == null) {
      atom.notifications.addError('Publish: unable to find a package.json file')
      return
    }

    this.gitStatus = GitStatus.getStatus(Path.dirname(packageFile))
    if ((this.gitStatus.stagedChanges.length > 0) || (this.gitStatus.unstagedChanges.length > 0)) {
      atom.notifications.addError('Publish: Cowardly refusing to publish.  ' +
        `Uncommitted changes exist on current branch (${this.gitStatus.branch})`)
      return
    }

    this.npmPackage = JSON.parse(Fs.readFileSync(packageFile))
    const currentVersion = this.npmPackage.version
    const newVersion = versionMethod(currentVersion)
    // repository and url are not required in npm package.json, the publish dialog will use
    //   this, if it exists, to render links for each of the commits displayed
    const repositoryUrl = this.npmPackage.repository ? this.npmPackage.repository.url : null
    const projectDir = this._getProjectDir()
    const changeLogFile = projectDir && this._getChangeLogFile(projectDir) || undefined
    const {commits} = this.getCommitsSinceLastTag(packageFile)

    const _this = this
    const publishViewProps = {
      currentBranch: this.gitStatus.branch,
      currentVersion,
      newVersion,
      commits,
      repositoryUrl,
      changeLogFile,
      onSave: values => {
        DialogView.unmountDialog(_this.publishView)
        _this._onPublish(values)
      },
      onCancel: values => {
        DialogView.unmountDialog(_this.publishView)
      },
    }
    this.publishView = DialogView.renderDialogToDom(PublishView, publishViewProps, 'publishView')

  },

  getCommitsSinceLastTag(packageJsonFile) {
    const commits = GitLog.getCommitHistory(Path.dirname(packageJsonFile))
    const commitsOut = []
    let lastVersionTag = null
    for (const commit of commits) {
      const matches = commit.message.match(/^(Prepare )?(v?\d+\.\d+\.\d+)( release)?$/i)
      if (matches != null) {
        lastVersionTag = matches[2]
        break
      }
      commitsOut.push(commit)
    }

    return {commits: commitsOut, lastVersionTag}
  },

  findPackageJson() {
    let packageJsonFile
    const projectDir = this._getProjectDir()
    if (projectDir == null) { return null }

    const testPath = Path.join(projectDir.getPath(), 'package.json')
    if (Fs.existsSync(testPath)) {
      packageJsonFile = testPath
    }

    if (packageJsonFile == null) {
      atom.notifications.addError(`Publish: Unable to locate package.json in project directory ${projectDir}`)
      return null
    }

    return packageJsonFile
  },

  _getProjectDir() {
    const projectDir = atom.project.getDirectories()[0]
    if (projectDir == null) {
      atom.notifications.addError('Publish: Open the project directory of the ' +
        'package you wish to publish and try again')
      return null
    }
    return projectDir
  },

  // partIndex: 0=major 1=minor 2=patch ...
  _bumpVersionPart(partIndex, currentVersion) {
    const parts = currentVersion.split('.')
    // zero out parts after the desired part
    if (partIndex < parts.length) {
      for (let i = partIndex + 1; i < parts.length; i++) {
        parts[i] = '0'
      }
    }
    parts[partIndex] = Number.parseInt(parts[partIndex], 10) + 1
    return parts.join('.')
  },

  _onPublish(attributes) {
    const publishProgressViewProps = {
      onCancel: () => this._onProgressCancel(),
      onSave: () => this._onProgressSave(),
    }
    this.publishProgressView = DialogView.renderDialogToDom(PublishProgressView,
      publishProgressViewProps, 'publishProgressView')
    this.publishProgressView.messageUser(`<h5>Publishing ${attributes.newVersion}...</h5>`)
    this._updateChangeLog(attributes)

    const subcommands = this._isAtomPackage() ?
      this._getApmCommands(attributes.newVersion) :
      this._getNpmCommands(attributes.newVersion)

    const commands = [
      'git add CHANGELOG.md',
      "git commit -m 'updated changelog via atom:publish'",
      `git pull origin ${this.gitStatus.branch}`,
    ].concat(subcommands, [(() => this._onPublishSuccess(attributes.newVersion))])

    // cancel any outstanding commands
    if (this.executor != null) {
      this.executor.cancelCommands()
    }

    this.executor.options.cwd = this._getProjectDir().getPath()
    // console.log('publish: going to execute:', commands)
    return this.executor.executeCommands(commands)
  },

  _updateChangeLog(attributes) {
    const projectDir = this._getProjectDir()
    if (!projectDir) { return }

    const changeLogFile = this._getChangeLogFile(projectDir)
    const changeLog = new ChangeLog(changeLogFile, this._getRepoUrl())
    const currentVersion = this.npmPackage.version

    // TODO : remove me after testing
    attributes.dryRun = true

    if (attributes.dryRun) {
      let preview = changeLog.preview(attributes.newVersion, currentVersion, attributes.description,
        attributes.commitsToInclude)
      preview = preview.replace(/\n/g, '<br>')
      this.publishProgressView.messageUser(`[DRY RUN]: would have added the following to<br>
        ${changeLogFile}:<br><br>${preview}`)

    } else {
      this.publishProgressView.messageUser(`Updating ${changeLogFile}...`)
      changeLog.update(attributes.newVersion, currentVersion, attributes.description,
        attributes.commitsToInclude)
    }
  },

  _isAtomPackage() {
    return this.npmPackage && this.npmPackage.engines && this.npmPackage.engines.atom ?
      this.npmPackage.engines.atom : null
  },

  _getRepoUrl() {
    return (this.npmPackage.repository != null ? this.npmPackage.repository.url != null ?
      this.npmPackage.repository.url : this.npmPackage.repository : null)
  },

  _getChangeLogFile(projectDir) {
    return Path.join(projectDir.getPath(), 'CHANGELOG.md')
  },

  _getApmCommands(newVersion) {
    return [
      `apm --no-color publish ${newVersion}`,
      `git push origin ${this.gitStatus.branch}`,
      'git push origin --tags',
    ]
  },

  _getNpmCommands(newVersion) {
    return [
      `npm version ${newVersion}`,
      `git push origin ${this.gitStatus.branch}`,
      'git push origin --tags',
      'npm publish',
    ]
  },

  _onProgressCancel() {
    this.executor && this.executor.cancelCommands()
    this.publishProgressView && this.publishProgressView.done('<br><br>Canceled')
  },

  _onProgressSave() {
    this.publishProgressView && DialogView.unmountDialog(this.publishProgressView)
  },

  _onCommandOutput(data) {
    return this.publishProgressView.messageUser(data.toString().replace(/\n/g, '<br>'))
  },

  _onCommandError(data) {
    return this.publishProgressView.messageUser(`<span class='text-error'>${data.toString()}</span>`)
  },


  _onPublishSuccess(newVersion) {
    this.publishProgressView.messageUser(`<br><br>Done.  You published ${newVersion} and it was good.`)
    return this.publishProgressView.done()
  },


  _onPublishFail(code) {
    this.publishProgressView.messageUser(`Failed to publish.  Last command exited with code: ${code}`)
    this.publishProgressView.done()
    return false // don't continue executing commands
  },
}


