'use babel'

import {$, View} from 'atom-space-pen-views'
import {CompositeDisposable} from 'atom'
import _ from 'underscore'
import BStr from 'bumble-strings'

import DialogView from './dialog-view'


export default class PublishView extends DialogView {

  static renderTitle() {
    // title is render at display time below.  see updateVersions()
    return ""
  }

  static renderBodyContent() {
    this.div({class: "left"}, () => {
      this.label("New version to publish:")
      this.input({type: "text", tabindex: 1, outlet: "newVersion"})
      return this.textarea({ 
        tabindex: 2, 
        rows: 4, 
        cols: 40, 
        placeholder: "optional summary description for change log",
        outlet: "description"
      })
    })
    return this.div({class: "right"}, () => {
      this.h5({class: "commit-count"})
      this.div(() => this.label("Include in change log?"))
      this.div({class: "commits scrollbars-visible-always"})
      return this.div({class: "scroll-shadow select-controls"}, () => {
        return this.raw(`Select:&nbsp;&nbsp${this._renderSelectLinks()}`)
      })
    })
  }

  static renderFooterContent() {
    super.renderFooterContent(...arguments)
    return this.span({class: "warnings text-error"})
  }

  static _renderSelectLinks() {
    const links = []
    const object = {
      'select-all': 'all',
      'select-none': 'none',
      'select-stars': ':star: and :bug: only'
    }
    for (let className in object) { 
      const name = object[className]
      links.push(this._renderSelectLink(className, name))
    } 
    return links.slice(0, -1).join(', ') + " or " + links.slice(-1)
  }

  static _renderSelectLink(className, name) {
    return `<a class="text-info ${className}">${name}</a>`
  }

  constructor() {
    super(...arguments)
  }

  initialize() {
    super.initialize(...arguments)
    this.saveButton.text("Publish")
    return this._initializeSelectLinks()
  }

  // takes `commit` objects from GitLog 
  showFor(currentVersion, newVersion, commits, gitStatus, npmPackage) {
    this.commits = commits
    this.gitStatus = gitStatus
    this.npmPackage = npmPackage
    this.show()
    this._updateVersions(currentVersion, newVersion)
    this._updateCommits(this.commits)
    return this._updateWarnings(this.gitStatus)
  }

  getSaveAttributes() {
    const selectedCommits = _.filter(this.commits, commit => {
      return this.find(`.commit[data-id='${commit.id}'] input`).prop('checked')
    })

    return {
      newVersion: this.newVersion.val(),
      description: this.description.val(),
      commits: selectedCommits
    }
  }

  _initializeSelectLinks() {
    this.find('.select-all').click(() => this.find('.commit input').prop('checked', true))
    this.find('.select-none').click(() => this.find('.commit input').prop('checked', false))
    return this.find('.select-stars').click(() => {
      this.find('.commit input').prop('checked', false)
      return _.filter(this.commits, c => BStr.weaklyHas(c.message, [':star:', ':bug'])).map((commit) =>
        this.find(`.commit[data-id='${commit.id}'] input`).prop('checked', true))
    })
  }

  _updateVersions(currentVersion, newVersion) {
    this.find('.dialog-title').html(`Currently at Version: ${currentVersion}`)
    this.newVersion.val(newVersion)
    return this.newVersion.focus()
  }

  _updateCommits(commits) {
    const $commits = this.find('.commits')
    if ((commits != null ? commits.length : undefined) <= 0) {
      $commits.html("There have not been any commits since the last tag")
      return
    }
    $commits.html("")
    for (let commit of commits) {
      $commits.append(this._renderCommit(commit))
    }

    this.find('.commit-count').text(`${commits.length} Commits Since Last Tag`)
  }

  _updateWarnings(gitStatus) {
    this.find('.warnings').text('')
    if (gitStatus.branch !== 'master') {
      return this.find('.warnings').text("Not on master branch, but you probably should be")
    }
  }

  _renderCommit(commit) {
    return `\
      <div class="commit" data-id="${commit.id}">
        <label><input type="checkbox" checked> ${commit.hash}</label> by ${commit.authorName} ${commit.relativeDate}: ${commit.message}
        ${this._renderCommitLink(commit)}
      </div>\
    `
  }

  // like https://github.com/littlebee/git-status-utils/commit/19a4528629e9384f5ccd439ff241bb9bd5223cd8
  _renderCommitLink(commit) {
    const repoUrl = (this.npmPackage.repository != null ? this.npmPackage.repository.url : undefined) || this.npmPackage.repository; 
    if ((repoUrl == null) || !BStr.weaklyHas(repoUrl, 'github.com')) {
      console.log("Publish: repository not found in package json or is not a github repo. not rendering commit link", repoUrl)
      return ""
    }

    const matches = repoUrl.match(/[^\:]*\:(\/\/github.com\/)?([^\.]*)/)
    const commitHref = `https://github.com/${matches[2]}/commit/${commit.id}`

    return `<a class="text-info" title="view revision diff on github" href="${commitHref}">...</a>`
  }
}
