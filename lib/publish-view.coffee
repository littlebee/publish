{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'

module.exports = class PublishView extends View
  
  @content = (currentVersion, newVersion) ->
    @div id: "publishModalBackdrop", class: "publish-modal-backdrop", =>
      @div class: "publish-modal", =>
        @div class: "modal-header", =>
          @h5 "Currently at Version: #{currentVersion}"
        @div class: "modal-body native-key-bindings", =>
          @label "New version to publish:"
          @input type: "text", tabindex: 1, outlet: "newVersion"
          @textarea 
            tabindex: 2 
            rows: 4, 
            cols: 50, 
            placeholder: "optional summary description for change log"
            outlet: "description"
            
        @div class: "modal-footer", =>
          @button "publish", class: 'btn btn-success', tabindex: 3, outlet: "saveButton"
          @button "cancel", class: 'btn', tabindex: 4, outlet: "cancelButton"
  
  initialize: (currentVersion, newVersion) ->
    @subscriptions = new CompositeDisposable()

    @appendTo atom.views.getView atom.workspace
    @subscriptions.add @saveButton.click @_onPublishClick
    @subscriptions.add @cancelButton.click @_onCancelClick
    @subscriptions.add $('#publishModalBackdrop').click @_onBackdropClick
    @subscriptions.add @newVersion.keypress @_onEnterPublish
    
    
  show: () =>
    super
    @newVersion.focus()
    

  destroy: () =>
    @subscriptions.destroy()
    super
    
    
  _onPublishClick: (evt) =>
    @hide()
    @trigger 'publish', 
      newVersion: @newVersion.val()
      description: @description.val()
    
    
  _onCancelClick: (evt) =>
    @trigger 'cancel', evt
    @hide()
    
    
  _onBackdropClick: (evt) =>
    if $(evt.target).is("#publishModalBackdrop")
      @_onCancelClick(evt)
    
    
  _onEnterPublish: (evt) =>
    if evt.which == 13
      @_onPublishClick()
  
