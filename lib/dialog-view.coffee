{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'
_ = require 'underscore'

module.exports = class DialogView extends View
  
  # override in your extension to put a title on it
  @getTitleText: () -> ""
  
  @content: (options) ->
    @div class: "publish-modal-backdrop", =>
      @div class: "publish-modal", =>
        @div class: "modal-header", =>
          @h5 class: "dialog-title", @getTitleText()
        @div class: "modal-body native-key-bindings", => 
          @innerContent()
        
        @div class: "modal-footer", =>
          @button "save", class: 'btn btn-success', tabindex: 3, outlet: "saveButton"
          @button "cancel", class: 'btn', tabindex: 4, outlet: "cancelButton"
          
          
  initialize: (options={}) ->
    @instanceOptions = _.defaults options,
      closeOnClickoff: true
      
    @subscriptions = new CompositeDisposable()
    @appendTo atom.views.getView atom.workspace
    
    @subscriptions.add @saveButton.click @_onSaveClick
    @subscriptions.add @cancelButton.click @_onCancelClick
    @subscriptions.add @click (evt) => @_onBackdropClick(evt)
    @subscriptions.add @find('input[type="text"], button').keydown @_onEnterSave
    @subscriptions.add @keydown @_onEnterSave
    
    
  destroy: =>
    @subscriptions.destroy()
    super
    
    
  show: =>
    super
    
    
  hide: =>
    super
    
    
  save: =>
    attributes = @getSaveAttributes()
    return if attributes == false
    @hide()
    @trigger 'save', attributes
    
    
  _onSaveClick: (evt) => @save()
  
  
  getSaveAttributes: => 
    # override this method in your extension to provide attributes back to caller
    # returning false cancels the save. you are responsible for user notification
    return true
    
  
  cancel: =>  
    @trigger 'cancel'
    @hide()
    
    
  _onCancelClick: (evt) => @cancel()
    
    
  _onBackdropClick: (evt) ->
    if $(evt.target).hasClass("publish-modal-backdrop") && @instanceOptions.closeOnClickoff
      @_onCancelClick(evt)
    
    
  _onEnterSave: (evt) =>
    if evt.which == 13
      evt.preventDefault()
      evt.stopImmediatePropagation()
      @_onSaveClick()
      
      
  
    
