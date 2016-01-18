{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'
_ = require 'underscore'

DialogView = require './dialog-view'

module.exports = class PublishProgressView extends DialogView
  
  @getTitleText: -> "Publishing Progress"
  
  @innerContent: () ->
    @div class: "inner fill scroll"
  
  initialize: (options={}) ->
    options = _.defaults options,
      closeOnClickoff: false
    
    super(options)
    
    @appendTo atom.views.getView atom.workspace
    @$console= @find('.inner')
    @currentMessages = @$console.html()
    @saveButton.hide()
    
    
    
  messageUser: (message) ->
    @currentMessages += "<p>#{message}</p>"
    @$console.html(@currentMessages)
    
    
