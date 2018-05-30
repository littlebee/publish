'use babel'

import React from 'react'
import _ from 'underscore'

import DialogView from './dialog-view'

export default class PublishProgressView extends React.Component {
  static displayName = 'PublishProgressView'

  constructor(props) {
    super(props)
    this.state = {
      isDone: false,
      messages: 'publishing...\n',
    }
    this.debouncedScrollToBottom = _.debounce(this.scrollToBottom, 100)
  }

  render() {
    return (
      <DialogView
        title="Publishing Progress"
        footerMessage={this._renderFooterMessage()}
        closeOnClickoff={this.state.isDone}
        cancelButtonText={this.state.isDone ? null : 'cancel'}
        saveButtonText={this.state.isDone ? 'ok' : null}
      >
        <div className="inner fill scroll" dangerouslySetHtml={this.state.messages}/>
      </DialogView>
    )
  }

  messageUser(message, options = {}) {
    options = _.defaults(options, {
      // add break after message?
      break: true,
    })
    if (options.break) {
      message += '<br>'
    }
    this.setState({messages: this.state.messages + message}, () => {
      return this.debouncedScrollToBottom()
    })
  }

  done(message = '') {
    this.messageUser(message)
    this.setState({isDone: true})
  }

  reset(newMessages = '') {
    this.setState({messages: newMessages, isDone: false})
  }


  scrollToBottom() {
    return this.$modalBody.animate({scrollTop: this.$console.height() - this.$modalBody.height()}, 200)
  }

  showCancelButton() {
    this.cancelButton.text('cancel')
      .addClass('btn-error')
      .removeClass('btn-primary')

    // to cancel an operation must be with intent
    this.instanceOptions.closeOnClickoff = false
  }

  showOkButton() {
    this.cancelButton.text(' ok ')
      .removeClass('btn-error')
      .addClass('btn-primary')
      .focus()

    this.instanceOptions.closeOnClickoff = true
  }
}
