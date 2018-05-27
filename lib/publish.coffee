
Fs = require 'fs'
Path = require 'path'
_ = require 'underscore'

GitLog = require 'git-log-utils'
GitStatus = require 'git-status-utils'

{TextEditor} = require 'atom'
SubAtom = require 'sub-atom'

PublishView = require './publish-view'
PublishProgressView = require './publish-progress-view'
CommandExecutor = require './command-executor'

ChangeLog = require './change-log'


module.exports = Publish =
  publishView: null
  timelinePanel: null
  subscriptions: null

  activate: (state) ->
    @publishView = new PublishView()
    @publishProgressView = new PublishProgressView()
    @executor = new CommandExecutor 
      onOutput: (data) => @_onCommandOutput(data)
      onError: (data) => @_onCommandError(data)
      onFail: (code) => @_onPublishFail(code)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new SubAtom()
    
    # Register commands
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:patch': => @patch()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:minor': => @minor()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:major': => @major()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:version': => @version()
    
    # @subscriptions.add @publishView, "save", (evt, attributes) => @_onPublish(attributes)
    # @subscriptions.add @publishProgressView, "cancel", @_onCancel
    @publishView.on "save", (evt, attributes) => @_onPublish(attributes)
    @publishProgressView.on "cancel", @_onCancel
    

  deactivate: ->
    @subscriptions.dispose()
    @publishView.destroy()


  serialize: ->
    publishViewState: @publishView.serialize()
    
    
  patch: ->
    @version (currentVersion) =>
      @_bumpVersionPart(2, currentVersion)


  minor: ->
    @version (currentVersion) =>
      @_bumpVersionPart(1, currentVersion)
    
  
  major: ->
    @version (currentVersion) =>
      @_bumpVersionPart(0, currentVersion)
    

  version: (versionMethod=null)->
    packageFile = @findPackageJson()
    unless packageFile?
      alert "Publish: unable to find a package.json file"
      return
      
    @gitStatus = GitStatus.getStatus Path.dirname(packageFile)
    if @gitStatus.stagedChanges.length > 0 || @gitStatus.unstagedChanges.length > 0
      alert "Publish: Cowardly refusing to publish.  Uncommitted changes exist on current branch (#{@gitStatus.branch})"
      return 
      
    @npmPackage = JSON.parse(Fs.readFileSync(packageFile))
    currentVersion = @npmPackage.version
    newVersion = versionMethod(currentVersion)
    
    [commits, lastVersionTag] = @getCommitsSinceLastTag(packageFile)
    if lastVersionTag != currentVersion
      console.log "Found last version in git log #{lastVersionTag} differs from package.json version #{currentVersion}.  Using version from git log."
      currentVersion = lastVersionTag
      
    @publishView.showFor(currentVersion, newVersion, commits, @gitStatus, @npmPackage)
    return
    
  
  getCommitsSinceLastTag: (packageJsonFile) ->
    commits = GitLog.getCommitHistory(Path.dirname(packageJsonFile))
    commitsOut = []
    lastVersionTag = null
    for commit in commits
      matches = commit.message.match /^(Prepare )?(v?\d+\.\d+\.\d+)( release)?$/i
      if matches?
        lastVersionTag =  matches[2]
        break;
      commitsOut.push commit 
    
    return [commitsOut, lastVersionTag]
    
    
  findPackageJson: ->
    projectDir = @_getProjectDir()
    return null unless projectDir?
      
    testPath = Path.join(projectDir.getPath(), 'package.json')
    if Fs.existsSync(testPath)
      packageJsonFile = testPath
      
    unless packageJsonFile?
      alert "Publish: Unable to locate package.json in project directory #{projectDir}"
      return
  
    return packageJsonFile
    
    
  _getProjectDir: ->
    projectDir = atom.project.getDirectories()[0]
    unless projectDir?
      alert 'Publish: Open the project directory of the package you wish to publish and try again'
      return null
    return projectDir
    

  
  # partIndex: 0=major 1=minor 2=patch ...
  _bumpVersionPart: (partIndex, currentVersion) ->
    parts = currentVersion.split('.')
    if partIndex < parts.length
      for i in [(partIndex + 1)...(parts.length)] 
        parts[i] = "0"
        
    parts[partIndex] = Number.parseInt(parts[partIndex]) + 1
    return parts.join('.')
    
    
  _onPublish:  (attributes) ->
    @publishProgressView.reset()
    @publishProgressView.show()
    @publishProgressView.messageUser "<h5>Publishing #{attributes.newVersion}...</h5>"
    
    @_updateChangeLog(attributes)
    
    subcommands = if @_isAtomPackage()
      @_getApmCommands(attributes.newVersion) 
    else 
      @_getNpmCommands(attributes.newVersion)
      
    commands = [
      "git add CHANGELOG.md"
      "git commit -m 'updated changelog via atom:publish'"
      "git pull origin #{@gitStatus.branch}"
    ].concat(subcommands, [(=> @_onPublishSuccess(attributes.newVersion))])
    
    # cancel any outstanding commands
    @executor?.cancelCommands()
    
    @executor.options.cwd = @_getProjectDir().getPath()
    console.log "publish: going to execute:", commands
    @executor.executeCommands commands
    
    
  _updateChangeLog: (attributes) ->
    projectDir = @_getProjectDir()
    return null unless projectDir
    
    changeLogFile = Path.join(projectDir.getPath(), 'CHANGELOG.md')
    @publishProgressView.messageUser "Updating #{changeLogFile}...", break: false 
        
    repoUrl = @npmPackage.repository?.url || @npmPackage.repository 
    changeLog = new ChangeLog(changeLogFile, repoUrl)
    changeLog.set(attributes.newVersion, attributes.description, attributes.commits)
    changeLog.write()
    @publishProgressView.messageUser ".  Done.<br>"
    
    
  _isAtomPackage: () ->
    @npmPackage?.engines?.atom?
    
    
  _getApmCommands: (newVersion) ->
    return [
      "apm --no-color publish #{newVersion}"
      "git push origin #{@gitStatus.branch}"
      "git push origin --tags"      
    ]
    
  _getNpmCommands: (newVersion) ->
    return [
      "npm version #{newVersion}"
      "git push origin #{@gitStatus.branch}"
      "git push origin --tags"
      "npm publish"
    ]


  _onCancel: () ->
    @executor?.cancelCommands()
    
    
  _onCommandOutput: (data) ->
    @publishProgressView.messageUser data.toString().replace(/\n/g, "<br>")
    

  _onCommandError: (data) ->
    @publishProgressView.messageUser "<span class='text-error'>#{data.toString()}</span>"
    

  _onPublishSuccess: (newVersion) ->
    @publishProgressView.messageUser "<br><br>Done.  You published #{newVersion} and it was good."
    @publishProgressView.done()
      
  
  _onPublishFail: (code) ->
    @publishProgressView.messageUser "Failed to publish.  Last command exited with code: #{code}"
    @publishProgressView.done()
    return false   # don't continue executing commands
    
      
  
  
    
    
  


