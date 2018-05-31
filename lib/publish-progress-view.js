'use babel'

import React from 'react'
import _ from 'underscore'

import DialogView from './dialog-view'

export default class PublishProgressView extends React.PureComponent {
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
        closeOnClickoff={this.state.isDone}
        cancelButtonText={this.state.isDone ? null : 'cancel'}
        saveButtonText={this.state.isDone ? 'ok' : null}
      >
        <div className="inner fill scroll" >
          <div dangerouslySetInnerHTML={{__html: this.state.messages}}/>
          <div ref={el => { this.messagesEnd = el }}/>
        </div>
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
    if (this.messagesEnd) {
      this.messagesEnd.scrollIntoView({behavior: 'smooth'})
    }
  }


}
