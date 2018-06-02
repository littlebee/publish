'use babel'

import React from 'react'
import PropTypes from 'prop-types'

import _ from 'underscore'

import DialogView from './dialog-view'

export default class PublishProgressView extends React.Component {
  static displayName = 'PublishProgressView'

  static propTypes = {
    onSave: PropTypes.func,
    onCancel: PropTypes.func,
  }

  constructor(props) {
    super(props)
    this.state = {
      isDone: false,
      messages: 'publishing...<br>',
    }
    this.debouncedScrollToBottom = _.debounce(this.scrollToBottom, 100)
  }

  render() {
    return (
      <DialogView
        title="Publishing Progress"
        closeOnClickoff={this.state.isDone}
        cancelButtonText={this.state.isDone ? null : 'Cancel'}
        saveButtonText={this.state.isDone ? 'OK' : null}
        onSave={this.props.onSave}
        onCancel={this.props.onCancel}
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
    this.setState((prevState, props) => {
      const newMessages = prevState.messages + message
      return {messages: newMessages}
    }, () => {
      this.debouncedScrollToBottom()
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
