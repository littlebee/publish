
Fs = require 'fs'
Path = require 'path'
_ = require 'underscore'
GitLog = require 'git-log-utils'

{TextEditor, CompositeDisposable} = require 'atom'

PublishView = require './publish-view'
PublishProgressView = require './publish-progress-view'


module.exports = Publish =
  publishView: null
  timelinePanel: null
  subscriptions: null

  activate: (state) ->
    @publishView = new PublishView()
    @publishProgressView = new PublishProgressView()

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    
    # Register commands
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:patch': => @patch()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:minor': => @minor()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:major': => @major()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:version': => @version()
    
    @subscriptions.add @publishView.on "save", (evt, attributes) => @_onPublish(attributes)
    @subscriptions.add @publishProgressView.on "cancel", @_onCancel
    

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
      console.warn "unable to find a package.json file"
      return
      
    packageObj = JSON.parse(Fs.readFileSync(packageFile))
    currentVersion = packageObj.version
    newVersion = versionMethod(currentVersion)
    
    [commits, lastVersionTag] = @getCommitsSinceLastTag(packageFile)
    if lastVersionTag != currentVersion
      console.log "Found last version in git log #{lastVersionTag} differs from package.json version #{currentVersion}.  Using version from git log."
      currentVersion = lastVersionTag
      
    @publishView.showFor(currentVersion, newVersion, commits)
    return
    
  
  getCommitsSinceLastTag: (packageJsonFile) ->
    commits = GitLog.getCommitHistory(Path.dirname(packageJsonFile))
    commitsOut = []
    lastVersionTag = null
    for commit in commits
      matches = commit.message.match /^(Prepare )?(\d+\.\d+\.\d+)( release)?$/i
      if matches?
        lastVersionTag =  matches[2]
        break;
      commitsOut.push commit 
    
    return [commitsOut, lastVersionTag]
    
    
  findPackageJson: ->
    editor = atom.workspace.getActiveTextEditor()
    path = editor?.getPath()
    unless path
      alert 'Publish: Open a file in the package you wish to publish and try again'
      return
      
    path = Path.dirname(path)
    paths = path.split(/[\\\/]/)
    index = paths.length
    packageJsonFile = null
    while index > 0
      testPath = Path.join(paths.slice(0, index)..., 'package.json')
      if Fs.existsSync(testPath)
        packageJsonFile = testPath
        break
      index -= 1
      
    unless packageJsonFile?
      alert "Publish: Unable to locate package.json along path #{Path.join(paths...)}"
      return
  
    return packageJsonFile
    
  
  # partIndex: 0=major 1=minor 2=patch ...
  _bumpVersionPart: (partIndex, currentVersion) ->
    parts = currentVersion.split('.')
    if partIndex < parts.length
      for i in [(partIndex + 1)..(parts.length - 1)] 
        parts[i] = "0"
        
    parts[partIndex] = Number.parseInt(parts[partIndex]) + 1
    return parts.join('.')
    
    
  _onPublish:  (attributes) ->
    @publishProgressView.show()
    
    @publishProgressView.messageUser "yay, you published #{attributes.newVersion} with description: '#{attributes.description.slice(0, 10)}...' " +
      "and #{attributes.commits.length} commits"
      
    _.delay (=>@publishProgressView.done()), 3000
      
  
    
    
    
  
  
    
    
  


