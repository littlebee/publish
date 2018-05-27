/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let DialogView;
const {$, View} = require("atom-space-pen-views");
const SubAtom = require('sub-atom');
const _ = require('underscore');

module.exports = (DialogView = class DialogView extends View {
  
  static content(options) {
    return this.div({class: "publish-modal-backdrop"}, () => {
      return this.div({class: "publish-modal"}, () => {
        this.renderHeader();
        this.renderBody();
        return this.renderFooter();
      });
    });  
  }
        

  /* 
    Override in your extension to put a title on it. Default is no title.
  */
  static getTitleText() { return ""; }
  
  
  /*
    Override this method to provide the content for your dialog
  */
  static renderBodyContent() {
    return this.div("override me to see some useful content");
  }


  /*
    Optionally extend this method to render additional / different header content
    wrapped in a .modal-header div 
  */
  static renderHeaderContent() {
    return this.h5({class: "dialog-title"}, this.getTitleText());
  }
    

  /*
    Extend this method to add additional buttons, etc in the footer.  For example,
    to add a button that makes your app crash to a dialog, you might do this:
    ```coffeescript
      class MyDialog extends DialogView
        
        @renderFooterContent: () ->
          super
          @button "crash", class: 'btn', outlet: "crashButton"
    ```
  */
  static renderFooterContent() {
    this.button("save", {class: 'btn btn-success', tabindex: 3, outlet: "saveButton"});
    return this.button("cancel", {class: 'btn', tabindex: 4, outlet: "cancelButton"});
  }
            

  /*
    You shouldn't need to override this method unless doing some
    extreme customization
  */
  static renderBody() {
    return this.div({outlet: '$modalBody', class: "modal-body native-key-bindings"}, () => { 
      return this.renderBodyContent();
    });
  }
        
        
  /*
    Unless you need to do extreme customization, you should probably instead
    extend the renderHeaderContent() method to customize the header
  */
  static renderHeader() {
    return this.div({class: "modal-header"}, () => {
      return this.renderHeaderContent();
    });
  }
    
  /*
    Unless you need to do extreme customization, you should probably instead
    extend the renderFooterContent() method to customize the header
  */
  static renderFooter() {
    return this.div({class: "modal-footer"}, () => {
      return this.renderFooterContent();
    });
  }
    
  
  constructor() {
    super(...arguments);
    this._onSaveClick = this._onSaveClick.bind(this);
    this._onCancelClick = this._onCancelClick.bind(this);
    this._onBackdropClick = this._onBackdropClick.bind(this);
  }
    
      
  initialize(options={}) {
    this.instanceOptions = _.defaults(options,
      {closeOnClickoff: true});
      
    this.appendTo(atom.views.getView(atom.workspace));
    
    this.subscriptions = new SubAtom();
    this.subscriptions.add(this.saveButton, 'click', this._onSaveClick);
    this.subscriptions.add(this.cancelButton, 'click', this._onCancelClick);
    return this.subscriptions.add(this, 'click',  evt => this._onBackdropClick(evt));
  }

    
  destroy() {
    this.subscriptions.destroy();
    return super.destroy(...arguments);
  }
    
  /*
    show dialog
  */  
  show() {
    return super.show(...arguments);
  }
    
    
  /*
    hide dialog
  */  
  hide() {
    return super.hide(...arguments);
  }
    
    
  /*
    save dialog contents.  Really just triggers a 'save' event 
    with the dialog attributes as a parameter.  
    
    You must listen for the 'save' event, or override this method
    to do something to actually save the user's input somewhere.
  */
  save() {
    const attributes = this.getSaveAttributes();
    if (attributes === false) { return; }
    this.hide();
    return this.trigger('save', attributes);
  }
    
    
  _onSaveClick(evt) { 
    return this.save();
  }
  
  /*
    Override this method in your extension to provide attributes back to caller.
    If your dialog has inputs, here you would query their values and provide
    back key: value attributes in a javascript object that your app knows what
    to do with.  
    
    Returning false cancels the save. you are responsible for user notification
  */
  getSaveAttributes() { 
    return true;
  }
    
  
  /*
    Cancels the dialog - closes it without saving.  Called when the user
    clicks the cancel button or the backdrop.
  */
  cancel() {  
    this.trigger('cancel');
    return this.hide();
  }
    

  _onCancelClick(evt) { 
    return this.cancel();
  }
    
    
  _onBackdropClick(evt) {
    if ($(evt.target).hasClass("publish-modal-backdrop") && this.instanceOptions.closeOnClickoff) {
      return this._onCancelClick(evt);
    }
  }
});
    
