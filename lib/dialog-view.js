'use babel'

import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import {autobind} from './helpers'


export default class DialogView extends React.PureComponent {

  static propTypes = {
    // without our children we are nothing
    children: PropTypes.any,
    // this is a controlled component
    show: PropTypes.bool,
    // title at the top of the dialog
    title: PropTypes.node,
    // additional buttons or message to render in footer of dialog
    footerMessage: PropTypes.node,
    // act as cancel button click when user clicks on backdrop
    closeOnClickoff: PropTypes.bool,
    // act as cancel button click when user presses escape key
    closeOnEscape: PropTypes.bool,
    // can set to null to not show ok button
    saveButtonText: PropTypes.string,
    // can set to null to not show cancel button
    cancelButtonText: PropTypes.string,

    onSave: PropTypes.func,
    onCancel: PropTypes.func,
  }

  static defaultProps = {
    title: 'Message',
    show: true,
    closeOnClickoff: true,
    saveButtonText: 'Save',
    cancelButtonText: 'Cancel',
  }

  static renderDialogToDom(Component, props, id) {
    const containerElement = document.createElement('div')
    containerElement.id = id
    document.body.appendChild(containerElement)
    const component = ReactDOM.render(<Component {...props}/>, containerElement)
    component._containerElement = containerElement

    return component
  }

  static unmountDialog(component) {
    if (!component || !component._containerElement) {
      return
    }
    ReactDOM.unmountComponentAtNode(component._containerElement)
    component._containerElement.remove()
    delete component._containerElement
  }


  constructor(props) {
    super(props)
    autobind(this, '_onSaveClick', '_onCancelClick', '_onBackdropClick', '_onEscape')
  }

  componentDidMount() {
    this._initFocus()
  }

  render() {
    if (!this.props.show) { return null }

    return (
      <div className="publish-modal-backdrop" onClick={this._onBackdropClick}>
        <div className="publish-modal">
          <div className="modal-header">
            <h5 className="dialog-title">{this.props.title}</h5>
          </div>
          <div className="modal-body native-key-bindings">
            {this.props.children || 'Oops.  Someone forgot to pass in children'}
          </div>
          <div className="modal-footer">
            {this._renderSaveButton()}
            {this._renderCancelButton()}
            {this.props.footerMessage}
          </div>
        </div>
      </div>
    )
  }

  _renderSaveButton() {
    if (!this.props.saveButtonText) {
      return null
    }
    return (
      <button className="btn btn-success" tabIndex={3} type="submit" onClick={this._onSaveClick}>
        {this.props.saveButtonText}
      </button>
    )
  }

  _renderCancelButton() {
    if (!this.props.cancelButtonText) {
      return null
    }
    return <button className="btn" tabIndex={3} onClick={this._onCancelClick}>{this.props.cancelButtonText}</button>
  }

  _initFocus() {
    const el = ReactDOM.findDOMNode(this)
    const focusables = el.querySelectorAll('input,textarea,checkbox,button')
    if (!(focusables && focusables.length > 0)) {
      return
    }
    for (const focusable of focusables) {
      focusable.addEventListener('focus', evt => {
        if (typeof evt.target.select === 'function') {
          evt.target.select()
        }
      })
    }
    const [first, last] = [focusables[0], focusables[focusables.length - 1]]
    first.focus()
    // traps focus in dialog
    last.addEventListener('focusout', evt => {
      first.focus()
    })
  }

  save() {
    (typeof this.props.onSave === 'function') && this.props.onSave()
  }

  _onSaveClick(evt) {
    this.save()
  }

  /*
    Cancels the dialog - closes it without saving.  Called when the user
    clicks the cancel button or the backdrop.
  */
  cancel() {
    (typeof this.props.onCancel === 'function') && this.props.onCancel()
  }

  _onCancelClick(evt) {
    return this.cancel()
  }

  _onBackdropClick(evt) {
    if (evt.target.classList.contains('publish-modal-backdrop') && this.props.closeOnClickoff) {
      this.cancel()
    }
  }

  _onEscape(evt) {
    if (this.props.closeOnEscape) {
      this.cancel()
    }
  }
}
