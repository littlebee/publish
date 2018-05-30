'use babel'

import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import autobind from './helpers'


export default class DialogView extends React.Component {

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
    saveButtonText: 'save',
    cancelButtonText: 'cancel',
  }

  static renderDialogToDom(Component, props, id, callback) {
    const containerElement = document.createElement('div')
    containerElement.id = id
    document.body.appendChild(containerElement)
    const component = ReactDOM.render(<Component {...props}/>, containerElement, callback)
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
    autobind(this, '_onSaveClick', '_onCancelClick', '_onBackdropClick')
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

  save() {
    this.props.onSave()
  }

  _onSaveClick(evt) {
    this.save()
  }

  /*
    Cancels the dialog - closes it without saving.  Called when the user
    clicks the cancel button or the backdrop.
  */
  cancel() {
    this.props.onCancel()
    return this.hide()
  }

  _onCancelClick(evt) {
    return this.cancel()
  }

  _onBackdropClick(evt) {
    if (evt.target.classList.contains('publish-modal-backdrop') && this.props.closeOnClickoff) {
      this._onCancelClick(evt)
    }
  }
}
