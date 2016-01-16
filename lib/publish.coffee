
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
    @publishView.show()
    return
    
  
  minor: ->
    
  
  major: ->
    

  version: ->
    
    
    
  
    
    
  


