
Fs = require 'fs'
Path = require 'path'
_ = require 'underscore'

PublishView = require './publish-view'
{TextEditor, CompositeDisposable} = require 'atom'


module.exports = Publish =
  publishView: null
  timelinePanel: null
  subscriptions: null

  activate: (state) ->
    @publishView = new PublishView(state.publishViewState)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable
    
    # Register commands
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:patch': => @patch()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:minor': => @minor()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:major': => @major()
    @subscriptions.add atom.commands.add 'atom-workspace', 'publish:version': => @version()
    
    @subscriptions.add @publishView.on "publish", (evt, publishInputs)->
      console.log evt
      alert "yay, you published #{publishInputs.newVersion} with description: '#{publishInputs.description.slice(0, 10)}...'"
    

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
    newVersion = versionMethod(packageObj. version)
    @publishView.showFor(packageObj.version, newVersion)
    return
    
  
  getCommitsSinceLastTag: (packageJsonFile) ->
    commits = GitLog.getCommitHistory(Path.dirname(packageJsonFile))
    commitsOut = []
    lastVersionFound
    for commit in commits
      matches = commit.message.match /^(Prepare )?(\d+\.\d+\.\d+)( release)?$/i
      if matches?
        lastVersionFound =  matches[2]
        break;
      commitsOut.push commit 
      
    
    return commitsOut
    
    
  findPackageJson: ->
    editor = atom.workspace.getActiveTextEditor()
    path = editor?.getPath()
    unless path
      alert "Open a file in the package you wish to publish and try again"
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
      alert "Unable to locate package.json along path #{Path.join(paths...)}"
      return
  
    return packageJsonFile
    
  
  # partIndex: 0=major 1=minor 2=patch ...
  _bumpVersionPart: (partIndex, currentVersion) ->
    parts = currentVersion.split('.')
    if parts.length <= partIndex
      for i in [parts.length..partIndex] 
        parts.push "0"
        
    parts[partIndex] = Number.parseInt(parts[partIndex]) + 1
    return parts.join('.')
    
    
    
  
  
    
    
  


