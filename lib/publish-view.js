'use babel'

import React from 'react'
import PropTypes from 'prop-types'

import {withFormik} from 'formik'

import DialogView from './dialog-view'
import CommitsSelector from './commits-selector'

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

  const _renderFooterMessage = () => {
    if (props.currentBranch !== 'master') {
      return <span className="publish--warnings text-error">Not on master branch, but you probably should be</span>
    }
    return null
  }

  // onSave is not needed for DialogView because the save button is type submit and gets
  // handled by Formik
  return (
    <form onSubmit={handleSubmit}>
      {/* DialogView has the submit button */}
      <DialogView title={'Currently at Version: ' + props.currentVersion}
        saveButtonText="Publish"
        onCancel={props.onCancel}
        footerMessage={_renderFooterMessage()}
      >
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
    // if provided, a link is rendered next to each commit
    repositoryUrl: PropTypes.string,
  }

  static defaultProps = {
    currentVersion: '',
    newVersion: '0.0.1',
    commits: [],
    currentBranch: '',
    repositoryUrl: null,
  }

  render() {
    return (
      <FormikForm {...this.props} />
    )
  }
}


