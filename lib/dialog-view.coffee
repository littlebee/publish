{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'
_ = require 'underscore'

module.exports = class DialogView extends View
  
  @content: (options) ->
    @div class: "publish-modal-backdrop", =>
      @div class: "publish-modal", =>
        @renderHeader()
        @renderBody()
        @renderFooter()  
        

  ### 
    Override in your extension to put a title on it. Default is no title.
  ###
  @getTitleText: () -> ""
  
  
  ###
    Override this method to provide the content for your dialog
  ###
  @renderBodyContent: () ->
    @div "override me to see some useful content"


  ###
    Optionally extend this method to render additional / different header content
    wrapped in a .modal-header div 
  ###
  @renderHeaderContent: () ->
    @h5 class: "dialog-title", @getTitleText()
    

  ###
    Extend this method to add additional buttons, etc in the footer.  For example,
    to add a button that makes your app crash to a dialog, you might do this:
    ```coffeescript
      class MyDialog extends DialogView
        
        @renderFooterContent: () ->
          super
          @button "crash", class: 'btn', outlet: "crashButton"
    ```
  ###
  @renderFooterContent: () ->
    @button "save", class: 'btn btn-success', tabindex: 3, outlet: "saveButton"
    @button "cancel", class: 'btn', tabindex: 4, outlet: "cancelButton"
            

  ###
    You shouldn't need to override this method unless doing some
    extreme customization
  ###
  @renderBody: () ->
    @div class: "modal-body native-key-bindings", => 
      @renderBodyContent()
        
        
  ###
    Unless you need to do extreme customization, you should probably instead
    extend the renderHeaderContent() method to customize the header
  ###
  @renderHeader: () ->
    @div class: "modal-header", =>
      @renderHeaderContent()
    
  ###
    Unless you need to do extreme customization, you should probably instead
    extend the renderFooterContent() method to customize the header
  ###
  @renderFooter: () ->
    @div class: "modal-footer", =>
      @renderFooterContent()
    
      
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
    
  ###
    show dialog
  ###  
  show: =>
    super
    
    
  ###
    hide dialog
  ###  
  hide: =>
    super
    
    
  ###
    save dialog contents.  Really just triggers a 'save' event 
    with the dialog attributes as a parameter.  
    
    You must listen for the 'save' event, or override this method
    to do something to actually save the user's input somewhere.
  ###
  save: =>
    attributes = @getSaveAttributes()
    return if attributes == false
    @hide()
    @trigger 'save', attributes
    
    
  _onSaveClick: (evt) => @save()
  
  ###
    Override this method in your extension to provide attributes back to caller.
    If your dialog has inputs, here you would query their values and provide
    back key: value attributes in a javascript object that your app knows what
    to do with.  
    
    Returning false cancels the save. you are responsible for user notification
  ###
  getSaveAttributes: => 
    return true
    
  
  ###
    Cancels the dialog - closes it without saving.  Called when the user
    clicks the cancel button or the backdrop.
  ###
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
      
      
  
    
