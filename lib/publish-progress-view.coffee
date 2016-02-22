{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'
_ = require 'underscore'

DialogView = require './dialog-view'

module.exports = class PublishProgressView extends DialogView
  
  @getTitleText: -> "Publishing Progress"
  
  @renderBodyContent: () ->
    @div class: "inner fill scroll", => "publishing..."
  
  constructor: () ->
    @debouncedScrollToBottom = _.debounce @scrollToBottom, 100
    super
    
  
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

    
    
  messageUser: (message, options={}) ->
    options = _.defaults options, 
      # add break after message?
      break: true    
      
    @currentMessages += message
    @currentMessages += "<br>" if options.break
    
    @$console.html(@currentMessages)
    @debouncedScrollToBottom()
    
    
  reset: (message="") ->
    @currentMessages = message
    @$console.html(@currentMessages)
    
    
  scrollToBottom: () ->
    @$modalBody.animate({scrollTop: @$console.height() - @$modalBody.height()}, 200)
    
    
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
    
