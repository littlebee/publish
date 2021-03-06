'use babel'

import React from 'react'
import PropTypes from 'prop-types'
import marked from 'marked'

import {withFormik} from 'formik'

import DialogView from './dialog-view'
import CommitsSelector from './commits-selector'
import ChangeLog from './change-log'

/* eslint react/prop-types: 0 */ // --> OFF because it thinks the InnerForm params are props
const InnerForm = props => {
  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = props

  const inputProps = {
    onChange: handleChange,
    onBlur: handleBlur,
  }

  const _renderFooterAddons = () => {
    const warningMessages = (props.currentBranch !== 'master') ?
      <span className="publish--warnings text-error">Not on master branch, but you probably should be</span>
      : null

    return (
      <span className="publish--dryrun">
        <label>
          <input
            name="dryRun"
            type="checkbox"
            checked={values.dryRun}
            {...inputProps}
          /> Dry Run?
        </label>
        {warningMessages}
      </span>
    )

  }

  const _renderChangeLogPreview = () => {
    const changeLog = new ChangeLog(props.changeLogFile, props.repositoryUrl)
    const markdown = changeLog.preview(values.newVersion, props.currentVersion, values.description,
      values.commitsToInclude)
    const html = marked(markdown)

    return (
      <div>
        <div><label>Change Log Preview:</label></div>
        <div dangerouslySetInnerHTML={{__html: html}}/>
      </div>
    )
  }

  // onSave is not needed for DialogView because the save button is type submit and gets
  // handled by Formik
  return (
    <form onSubmit={handleSubmit}>
      {/* DialogView has the submit button */}
      <DialogView title={'Currently at Version: ' + props.currentVersion}
        saveButtonText="Publish"
        onCancel={props.onCancel}
        footerMessage={_renderFooterAddons()}
      >
        <div className="publish--top">
          <div className="publish--left">
            <label>
              New version to publish:
              <input
                type="string"
                name="newVersion"
                value={values.newVersion}
                tabIndex={1}
                {...inputProps}
              />
            </label>
            {touched.newVersion && errors.newVersion && <div>{errors.newVersion}</div>}
            <textarea
              name="description"
              value={values.description}
              rows="4"
              cols="40"
              placeholder="optional summary description for change log"
              tabIndex={2}
              {...inputProps}
            />
            {touched.description && errors.description && <div>{errors.description}</div>}
          </div>
          <div className="publish--right">
            <CommitsSelector
              name="commitsToInclude"
              commits={props.commits}
              repositoryUrl={props.repositoryUrl}
              onChange={setFieldValue}
              onBlur={setFieldTouched}
              tabIndex={1}
            />
          </div>
        </div>
        <div className="publish--bottom">
          {_renderChangeLogPreview()}
        </div>
      </DialogView>
    </form>
  )
}

// Wrap our form with the using withFormik HoC
const FormikForm = withFormik({
  // Transform outer props into form values
  mapPropsToValues: props => ({
    newVersion: props.newVersion,
    description: '',
    commitsToInclude: props.commits,
    dryRun: props.dryRun,
  }),
  // Add a custom validation function (this can be async too!)
  validate: (values, props) => {
    const errors = {}
    if (!values.newVersion) {
      errors.newVersion = 'Required'
    }
    return errors
  },
  // Submission handler
  handleSubmit: (
    values,
    {
      props,
    },
  ) => {
    props.onSave(values)
  },

})(InnerForm)

export default class PublishView extends React.Component {
  static propsTypes = {
    onSave: PropTypes.func.required,
    onCancel: PropTypes.func.required,
    currentBranch: PropTypes.string,
    currentVersion: PropTypes.string,
    newVersion: PropTypes.string,
    commits: PropTypes.array,
    dryRun: PropTypes.bool,
    // if provided, a link is rendered next to each commit
    repositoryUrl: PropTypes.string,
  }

  static defaultProps = {
    currentBranch: '',
    currentVersion: '',
    dryRun: atom.devMode === true,
    newVersion: '0.0.1',
    commits: [],
    repositoryUrl: null,
  }

  render() {
    return (
      <FormikForm {...this.props} />
    )
  }
}


