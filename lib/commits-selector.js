'use babel'

import React from 'react'
import PropTypes from 'prop-types'
import BStr from 'bumble-strings'
import {autobind} from './helpers'

// renders a list of commits with checkboxes and allows the user to select
// all, none or individual commits to feature in the change log
export default class CommitsSelector extends React.Component {

  static propTypes = {
    // name for form input name passed on Change
    name: PropTypes.string,
    // commits have a selected parameter to tell us which are selected
    commits: PropTypes.array.isRequired,
    // called with (props.name, updatedCommits).  The commits
    onChange: PropTypes.func.isRequired,
    // repository url is used to optionally render links for commits
    repositoryUrl: PropTypes.string,
  }

  static defaultProps = {
    repositoryUrl: null,
  }

  constructor(...args) {
    super(...args)
    this.state = {
      selectedCommits: [],
    }
    autobind(this, '_onChange', '_onSelectAll', '_onSelectNone', '_onSelectStarsAndBugs')
  }

  componentDidMount() {
    // shallow copy should be okay - we don't mutate the commit objects in the array, only the
    // array of which are selected
    this.setState({selectedCommits: this.props.commits.slice(0)})
  }

  render() {
    return (
      <div>
        <h5 className="commit-count">{this.props.commits.length || 'No'} Commits Since Last Tag</h5>
        <div><label>Include in change log?</label></div>
        <div className="commits scrollbars-visible-always">
          {this._renderCommits()}
        </div>
        <div className="scroll-shadow select-controls">
          <label>Select:</label> {this._renderSelectLinks()}
        </div>
      </div>
    )
  }

  _renderCommits() {
    const commits = this.props.commits
    return commits.map((commit, index) => { return this._renderCommit(commit, index) })
  }

  _renderCommit(commit, index) {
    const _onChange = evt => { this._onChange(evt, commit, index) }
    const isSelected = this.state.selectedCommits.indexOf(commit) !== -1
    return (
      <div className="commit" key={index}>
        <label><input key={index} type="checkbox"
          checked={isSelected} onChange={_onChange}/> {commit.hash} </label>
        by {commit.authorName} {commit.relativeDate}: {commit.message}
        {this._renderCommitLink(commit)}
      </div>
    )
  }

  _renderCommitLink(commit) {
    const repoUrl = this.props.repositoryUrl
    if ((repoUrl == null) || !BStr.weaklyHas(repoUrl, 'github.com')) {
      return null
    }
    const matches = repoUrl.match(/[^\:]*\:(\/\/github.com\/)?([^\.]*)/)
    const commitHref = `https://github.com/${matches[2]}/commit/${commit.id}`

    return (
      <a className="text-info" title="view revision diff on github" href={commitHref}>...</a>
    )
  }

  _renderSelectLinks() {
    const links = []
    const linksMetadata = [{
      method: this._onSelectAll,
      label: 'all',
    }, {
      method: this._onSelectNone,
      label: 'none',
    }, {
      method: this._onSelectStarsAndBugs,
      label: ':star: and :bug: only',
    }]
    const len = linksMetadata.length
    linksMetadata.forEach((linkMetadata, index) => {
      if (index === len - 1) {
        links.push(' or ')
      }
      links.push(this._renderSelectLink(linkMetadata, index))
      if (len > 1 && index < len - 2) { links.push(', ') }
    })
    return links
  }

  _renderSelectLink(linkMetadata, index) {
    return (
      <a key={index} className="text-info" onClick={linkMetadata.method}>{linkMetadata.label}</a>
    )
  }

  _handleChange(selectedCommits) {
    this.setState({selectedCommits})
    this.props.onChange(this.props.name, selectedCommits)
  }

  _onChange(evt, commit, index) {
    let selectedCommits = this.state.selectedCommits
    if (evt.target.checked) {
      if (selectedCommits.indexOf(commit) === -1) {
        selectedCommits.push(commit)
      }
    } else {
      selectedCommits = selectedCommits.filter(c => { return c !== commit })
    }
    this._handleChange(selectedCommits)
  }

  _onSelectAll() {
    this._handleChange(this.props.commits.slice(0))
  }
  _onSelectNone() {
    this._handleChange([])
  }
  _onSelectStarsAndBugs() {
    const selectedCommits = this.props.commits.filter(commit => {
      return BStr.weaklyHas(commit.message, [':star:', ':bug'])
    })
    this._handleChange(selectedCommits)
  }
}
