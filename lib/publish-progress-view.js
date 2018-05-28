'use babel'

import {$, View} from 'atom-space-pen-views'
import _ from  'underscore'
import DialogView from  './dialog-view'

export default class PublishProgressView extends DialogView {

  static getTitleText() { return "Publishing Progress"; }

  static renderBodyContent() {
    return this.div({class: "inner fill scroll"}, () => "publishing...")
  }
  
  constructor() {
    super(...arguments)
    this.debouncedScrollToBottom = _.debounce(this.scrollToBottom, 100)
  }
    

  initialize(options={}) {
    options = _.defaults(options,
      {closeOnClickoff: false})

    super.initialize(options)

    this.appendTo(atom.views.getView(atom.workspace))
    this.$console= this.find('.inner')
    this.currentMessages = this.$console.html()
    return this.saveButton.hide()
  }

  show() {
    super.show(...arguments)
    return this.showCancelButton()
  }

  messageUser(message, options={}) {
    options = _.defaults(options,
      // add break after message?
      {break: true})

    this.currentMessages += message
    if (options.break) { this.currentMessages += "<br>"; }

    this.$console.html(this.currentMessages)
    return this.debouncedScrollToBottom()
  }

  reset(message="") {
    this.currentMessages = message
    return this.$console.html(this.currentMessages)
  }

  scrollToBottom() {
    return this.$modalBody.animate({scrollTop: this.$console.height() - this.$modalBody.height()}, 200)
  }

  // primarily toggles cancel button to OK and
  done(message="") {
    return this.showOkButton()
  }

  showCancelButton() {
    this.cancelButton.text("cancel")
    .addClass('btn-error')
    .removeClass('btn-primary')

    // to cancel an operation must be with intent
    return this.instanceOptions.closeOnClickoff = false
  }

  showOkButton() {
    this.cancelButton.text(" ok ")
    .removeClass('btn-error')
    .addClass('btn-primary')
    .focus()

    return this.instanceOptions.closeOnClickoff = true
  }
}
