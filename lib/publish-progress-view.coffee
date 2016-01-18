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
    
    
  show: () ->
    super
    @showCancelButton()

    
    
  messageUser: (message) ->
    @currentMessages += "<p>#{message}</p>"
    @$console.html(@currentMessages)
    
    
  # primarily toggles cancel button to OK and 
  done: (message="") ->
    @showOkButton()
            
    
  showCancelButton: () ->
    @cancelButton.text("cancel")
    .addClass('btn-error')
    .removeClass('btn-primary')
    
    # to cancel an operation must be with intent
    @instanceOptions.closeOnClickoff = false
    
    
  showOkButton: () ->
    @cancelButton.text(" ok ")
    .removeClass('btn-error')
    .addClass('btn-primary')
    .focus()

    @instanceOptions.closeOnClickoff = true
    
